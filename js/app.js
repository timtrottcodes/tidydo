$(document).ready(function () {
  let data = {
    lists: [],
    myDay: [],
  };
  let currentListId = null;
  let isCreatingList = false;
  let isCreatingTask = false;
  let isViewingMyDay = true;

  function saveData() {
    localStorage.setItem("todoData", JSON.stringify(data));
  }

  function loadData() {
    const stored = localStorage.getItem("todoData");
    if (stored) data = JSON.parse(stored);
  }

  function renderLists() {
    const container = $("#listContainer");
    container.empty();

    // My Day button
    const myDayBtn = $(
      `<li class="list-group-item list-group-item-action fw-bold" id="myDayBtn">
          ☀️ My Day
        </li>`
    );
    myDayBtn.click(() => {
      currentListId = null;
      isViewingMyDay = true;
      renderMyDay();
    });
    container.append(myDayBtn);

    data.lists.forEach((list, index) => {
      const item = $(`<li class="list-group-item d-flex align-items-center">
          <span class="list-color" style="background:${list.color}"></span>${list.title}
        </li>`);
      item.click(() => {
        currentListId = index;
        isViewingMyDay = false;
        renderTasks();
      });
      container.append(item);
    });

    const darkModeToggle = $(`
        <li class="list-group-item d-flex align-items-center justify-content-between">
        <span><i class="bi bi-moon-stars"></i> Dark Mode</span>
        <div class="form-check form-switch m-0">
            <input class="form-check-input" type="checkbox" id="darkModeToggle" />
        </div>
        </li>`);

    const importBtn = $(`
        <li class="list-group-item list-group-item-action text-primary" style="cursor:pointer;">
          <i class="bi bi-file-earmark-arrow-up me-2" style="font-size:1.2rem;"></i> Import JSON
        </li>`);
    const exportBtn = $(`
        <li class="list-group-item list-group-item-action text-primary" style="cursor:pointer;">
          <i class="bi bi-file-earmark-arrow-down me-2" style="font-size:1.2rem;"></i> Export JSON
        </li>`);

    container.append(darkModeToggle);
    container.append(importBtn);
    container.append(exportBtn);

    // Import click: trigger hidden file input
    importBtn.click(() => {
      $("#importFileInput").click();
    });

    // Handle file selection for import
    $("#importFileInput")
      .off("change")
      .on("change", function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.lists && Array.isArray(importedData.lists)) {
              data = importedData;
              saveData();
              renderLists();
              if (isViewingMyDay) renderMyDay();
              else renderTasks();
              alert("Import successful!");
            } else {
              alert("Invalid JSON format.");
            }
          } catch (err) {
            alert("Error parsing JSON file.");
          }
          $("#importFileInput").val(""); // reset input
        };
        reader.readAsText(file);
      });

    // Export click: download current data as JSON file
    exportBtn.click(() => {
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = $("<a>").attr("href", url).attr("download", "todo-data-export.json").appendTo("body");
      a[0].click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  function animateTaskInsert($el) {
    $el.css({ opacity: 0, transform: "translateY(-10px)" });
    setTimeout(() => $el.css({ transition: "all 0.3s", opacity: 1, transform: "translateY(0)" }), 10);
  }

  function isToday(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    const date = new Date(dateStr);
    return date.toDateString() === today.toDateString();
  }

  function renderMyDay() {
    const taskSection = $("#taskSection");
    const noListMessage = $("#noListMessage");

    noListMessage.hide();
    taskSection.show();

    $("#currentListTitle").text("My Day");
    $("#editListBtn").hide();

    const taskList = $("#taskList");
    const completedList = $("#completedTasks");
    const completedToggle = $("#completedToggle");
    const completedCollapse = new bootstrap.Collapse(document.getElementById("completedTasks"), { toggle: false });

    taskList.empty();
    completedList.empty();
    let completedCount = 0;

    data.lists.forEach((list, listIndex) => {
      list.tasks.forEach((task, taskIndex) => {
        const showByDay = task.myDay || isToday(task.reminder) || isToday(task.dueDate);
        if (!showByDay) return;

        const taskEl = $(`
          <li class="list-group-item task-transition d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center flex-grow-1">
              ${isViewingMyDay ? `<span class="list-color me-2" style="background:${list.color}"></span>` : ""}
              <input type="checkbox" class="form-check-input me-2"> ${task.title}
            </div>
            <div class="task-icons d-flex gap-2 text-secondary small"></div>
          </li>
        `);

        const $icons = taskEl.find(".task-icons");
        const now = new Date();

        if (task.dueDate) {
          const due = new Date(task.dueDate);
          const isOverdue = due < now && !task.completed;
          const dueLabel = due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
          const dueClass = isOverdue ? "text-danger fw-bold" : "text-secondary";
          $icons.append(`<span title="Due: ${dueLabel}" class="bi bi-calendar-event ${dueClass}"></span>`);
        }
        
        if (task.reminder) {
          const reminder = new Date(task.reminder);
          const isMissed = reminder < now && !task.reminderNotified && !task.completed;
          const label = reminder.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          const reminderClass = isMissed ? "text-danger pulse" : "text-warning";
          $icons.append(`<span title="Reminder: ${label}" class="bi bi-bell ${reminderClass}"></span>`);
        }
        
        if (task.repeat && task.repeat !== "none") {
          const repeatLabel = task.repeat[0].toUpperCase() + task.repeat.slice(1);
          $icons.append(`<span title="Repeats: ${repeatLabel}" class="bi bi-arrow-repeat text-info"></span>`);
        }

        if (task.completed) {
          taskEl.addClass("task-complete");
          taskEl.find("input").prop("checked", true);
          completedList.append(taskEl);
          completedCount++;
        } else {
          taskList.append(taskEl);
          animateTaskInsert(taskEl);
        }

        taskEl.find("input").change(function () {
          task.completed = this.checked;
          handleTaskCompletion(task, listIndex);
          $(this)
            .closest("li")
            .slideUp(200, () => {
              saveData();
              renderMyDay();
            });
        });

        taskEl.click(function (e) {
          if (!$(e.target).is("input")) {
            currentListId = listIndex;
            openTaskModal(taskIndex);
          }
        });
      });
    });

    if (taskList.children().length === 0) {
      taskList.append(`<li class="list-group-item text-success fst-italic">🎉 Congratulations, your day is clear!</li>`);
    }

    $("#addTaskBtn").hide();
    $("#completedToggle").hide();
  }

  function renderTasks() {
    const taskSection = $("#taskSection");
    const noListMessage = $("#noListMessage");

    if (currentListId === null) {
      renderMyDay();
      return;
    } else {
      isViewingMyDay = false;
      noListMessage.hide();
      taskSection.show();
    }

    $("#addTaskBtn").show();
    $("#completedToggle").show();

    const list = data.lists[currentListId];
    $("#currentListTitle").text(list.title);
    $("#editListBtn")
      .show()
      .off("click")
      .on("click", function () {
        $("#editListTitle").val(list.title);
        $("#editListColor").val(list.color);
        $("#editListModal").modal("show");
      });

    const taskList = $("#taskList");
    const completedList = $("#completedTasks");
    const completedToggle = $("#completedToggle");
    const completedCollapse = new bootstrap.Collapse(document.getElementById("completedTasks"), { toggle: false });

    taskList.empty();
    completedList.empty();

    let completedCount = 0;

    list.tasks.forEach((task, i) => {
      const taskEl = $(`
        <li class="list-group-item task-transition d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center flex-grow-1">
            ${isViewingMyDay ? `<span class="list-color me-2" style="background:${list.color}"></span>` : ""}
            <input type="checkbox" class="form-check-input me-2"> ${task.title}
          </div>
          <div class="task-icons d-flex gap-2 text-secondary small"></div>
        </li>
      `);
      const $icons = taskEl.find(".task-icons");
      const now = new Date();

      if (task.dueDate) {
        const due = new Date(task.dueDate);
        const isOverdue = due < now && !task.completed;
        const dueLabel = due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        const dueClass = isOverdue ? "text-danger fw-bold" : "text-secondary";
        $icons.append(`<span title="Due: ${dueLabel}" class="bi bi-calendar-event ${dueClass}"></span>`);
      }
      
      if (task.reminder) {
        const reminder = new Date(task.reminder);
        const isMissed = reminder < now && !task.reminderNotified && !task.completed;
        const label = reminder.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const reminderClass = isMissed ? "text-danger pulse" : "text-warning";
        $icons.append(`<span title="Reminder: ${label}" class="bi bi-bell ${reminderClass}"></span>`);
      }
      
      if (task.repeat && task.repeat !== "none") {
        const repeatLabel = task.repeat[0].toUpperCase() + task.repeat.slice(1);
        $icons.append(`<span title="Repeats: ${repeatLabel}" class="bi bi-arrow-repeat text-info"></span>`);
      }

      if (task.completed) {
        taskEl.addClass("task-complete");
        taskEl.find("input").prop("checked", true);
        completedList.append(taskEl);
        completedCount++;
      } else {
        taskList.append(taskEl);
        animateTaskInsert(taskEl);
      }

      taskEl.find("input").change(function () {
        task.completed = this.checked;
        handleTaskCompletion(task, currentListId);
        $(this)
          .closest("li")
          .slideUp(200, () => {
            saveData();
            renderTasks();
          });
      });

      taskEl.click(function (e) {
        if (!$(e.target).is("input")) openTaskModal(i);
      });
    });

    if (taskList.children().length === 0) {
      taskList.append(`<li class="list-group-item text-muted fst-italic">No tasks in this list yet.</li>`);
    }

    const isVisible = $("#completedTasks").hasClass("show");
    const label = isVisible ? "Hide" : "Show";
    completedToggle.text(`${label} Completed Tasks (${completedCount})`);

    taskList.sortable({
      update: function (event, ui) {
        const newOrder = taskList
          .children()
          .map(function () {
            return $(this).text().trim();
          })
          .get();

        const reordered = [];
        newOrder.forEach((title) => {
          const task = list.tasks.find((t) => !t.completed && t.title === title);
          if (task) reordered.push(task);
        });

        const completed = list.tasks.filter((t) => t.completed);
        list.tasks = [...reordered, ...completed];
        saveData();
      },
    });
  }

  $("#completedToggle").on("click", function () {
    const completedTasks = $("#completedTasks");
    const collapseInstance = bootstrap.Collapse.getOrCreateInstance(completedTasks[0]);
    const isVisible = completedTasks.hasClass("show");

    if (isVisible) {
      collapseInstance.hide();
      $(this).text($(this).text().replace("Hide", "Show"));
    } else {
      collapseInstance.show();
      $(this).text($(this).text().replace("Show", "Hide"));
    }
  });

  $("#saveListChanges").on("click", function () {
    const title = $("#editListTitle").val().trim();
    const color = $("#editListColor").val();
    if (currentListId !== null && title) {
      data.lists[currentListId].title = title;
      data.lists[currentListId].color = color;
      saveData();
      renderLists();
      renderTasks();
      $("#editListModal").modal("hide");
    }
  });

  function openTaskModal(taskIndex) {
    const task = data.lists[currentListId].tasks[taskIndex];
    $("#taskTitleInput").val(task.title);
    $("#taskNotes").val(task.notes || "");
    $("#dueDate").val(task.dueDate || "");
    $("#reminder").val(task.reminder || "");
    $("#repeatOption").val(task.repeat || "none");
    $("#myDayCheckbox").prop("checked", task.myDay || false);

    $("#saveTaskChanges")
      .off("click")
      .on("click", function () {
        task.title = $("#taskTitleInput").val();
        task.notes = $("#taskNotes").val();
        task.dueDate = $("#dueDate").val();
        task.reminder = $("#reminder").val();
        task.repeat = $("#repeatOption").val();
        task.myDay = $("#myDayCheckbox").is(":checked");

        if (task.myDay && !data.myDay.includes(task)) {
          data.myDay.push(task);
        }

        $("#taskModal").modal("hide");
        saveData();
        isViewingMyDay ? renderMyDay() : renderTasks();
      });

    $("#taskModal").modal("show");
  }

  function openNewListModal() {
    isCreatingList = true;
    $("#newItemTitle").val("");
    $("#newItemColor").val("#0d6efd");
    $("#newItemModalLabel").text("Create New List");
    $("#newItemModal").modal("show");
  }

  function openNewTaskModal() {
    if (currentListId === null) return;
    isCreatingTask = true;
    $("#newItemTitle").val("");
    $("#newItemColor").val("");
    $("#newItemModalLabel").text("Create New Task");
    $("#newItemModal").modal("show");
  }

  $("#confirmNewItem").click(function () {
    const title = $("#newItemTitle").val().trim();
    const color = $("#newItemColor").val() || "#0d6efd";
    if (!title) return;

    if (isCreatingList) {
      data.lists.push({ title, color, tasks: [] });
      renderLists();
      isCreatingList = false;
    } else if (isCreatingTask && currentListId !== null) {
      data.lists[currentListId].tasks.push({ title, completed: false });
      renderTasks();
      isCreatingTask = false;
    }

    saveData();
    $("#newItemModal").modal("hide");
  });

  // On page load: set dark mode based on saved preference or system preference
  let prefersDark = false;
  const savedPreference = localStorage.getItem("darkMode");
  if (savedPreference !== null) {
    prefersDark = savedPreference === "true";
  } else {
    prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  applyDarkMode(prefersDark);
  setTimeout(() => {
    $("#darkModeToggle").prop("checked", prefersDark);
  }, 0);

  $(document).on("change", "#darkModeToggle", function () {
    const enabled = $(this).is(":checked");
    applyDarkMode(enabled);
    localStorage.setItem("darkMode", enabled);
  });

  $("#addListBtn").click(openNewListModal);
  $("#addTaskBtn").click(openNewTaskModal);

  loadData();
  renderLists();
  renderMyDay();
  checkReminders();
  setInterval(checkReminders, 60000); // every 1 min

  function applyDarkMode(enabled) {
    if (enabled) {
      $("body").addClass("dark-mode");
      $("#darkModeToggle").prop("checked", true);
    } else {
      $("body").removeClass("dark-mode");
      $("#darkModeToggle").prop("checked", false);
    }
  }

  function handleTaskCompletion(task, listIndex) {
    // Recurring automation
    if (task.completed && task.repeat && task.repeat !== "none") {
      const newTask = { ...task, completed: false };

      const now = new Date();
      const due = task.dueDate ? new Date(task.dueDate) : now;

      switch (task.repeat) {
        case "daily":
          due.setDate(due.getDate() + 1);
          break;
        case "weekly":
          due.setDate(due.getDate() + 7);
          break;
        case "monthly":
          due.setMonth(due.getMonth() + 1);
          break;
      }

      newTask.dueDate = due.toISOString().split("T")[0];
      newTask.reminder = "";
      delete newTask.reminderNotified;
      data.lists[listIndex].tasks.push(newTask);
    }
  }

  function checkReminders() {
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60 * 1000);

    data.lists.forEach((list) => {
      list.tasks.forEach((task) => {
        if (task.reminder /*&& !task.reminderNotified */) {
          const reminderTime = new Date(task.reminder);
          if (reminderTime >= now && reminderTime <= soon) {
            showNotification(`Reminder: ${task.title}`, `From list: ${list.title}`);
            //task.reminderNotified = true; // prevent repeat
          }
        }
      });
    });

    saveData();
  }

  function showNotification(title, body) {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(title, { body });
        }
      });
    }
  }
});
