$(document).ready(function () {
  // ----- State Variables -----
  let data = {
    lists: [],
    myDay: [],
  };
  let currentListId = null;
  let isCreatingList = false;
  let isCreatingTask = false;
  let isViewingMyDay = true;

  // ----- Storage Functions -----
  function saveData() {
    localStorage.setItem("todoData", JSON.stringify(data));
  }

  function loadData() {
    const stored = localStorage.getItem("todoData");
    if (stored) data = JSON.parse(stored);
  }

  // ----- Utility Functions -----
  function isToday(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    const date = new Date(dateStr);
    return date.toDateString() === today.toDateString();
  }

  // Creates and returns jQuery elements for the task icons with color and animation classes
  function createTaskIcons(task) {
    const $icons = $('<div class="task-icons d-flex gap-2 text-secondary small"></div>');
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

    return $icons;
  }

  function animateTaskInsert($el) {
    $el.css({ opacity: 0, transform: "translateY(-10px)" });
    setTimeout(() => $el.css({ transition: "all 0.3s", opacity: 1, transform: "translateY(0)" }), 10);
  }

  // ----- Rendering Functions -----
  // Render the left sidebar list of lists + My Day + controls
  function renderLists() {
    const container = $("#listContainer");
    container.empty();

    // My Day button
    const myDayBtn = $(`
      <li class="list-group-item list-group-item-action fw-bold" id="myDayBtn">☀️ My Day</li>
    `);
    myDayBtn.click(() => {
      currentListId = null;
      isViewingMyDay = true;
      renderMyDay();
    });
    container.append(myDayBtn);

    // Render user lists
    data.lists.forEach((list, index) => {
      const item = $(`
        <li class="list-group-item d-flex align-items-center list-group-item-action">
          <span class="list-color" style="background:${list.color}"></span>${list.title}
        </li>
      `);
      item.click(() => {
        currentListId = index;
        isViewingMyDay = false;
        renderTasks();
      });
      container.append(item);
    });

    // Dark mode toggle and import/export
    const darkModeToggle = $(`
      <li class="list-group-item d-flex align-items-center justify-content-between">
        <span><i class="bi bi-moon-stars"></i> Dark Mode</span>
        <div class="form-check form-switch m-0">
          <input class="form-check-input" type="checkbox" id="darkModeToggle" />
        </div>
      </li>
    `);
    const importBtn = $(`
      <li class="list-group-item list-group-item-action text-primary" style="cursor:pointer;">
        <i class="bi bi-file-earmark-arrow-up me-2" style="font-size:1.2rem;"></i> Import JSON
      </li>
    `);
    const exportBtn = $(`
      <li class="list-group-item list-group-item-action text-primary" style="cursor:pointer;">
        <i class="bi bi-file-earmark-arrow-down me-2" style="font-size:1.2rem;"></i> Export JSON
      </li>
    `);

    container.append(darkModeToggle, importBtn, exportBtn);

    // Import and Export handlers
    importBtn.click(() => $("#importFileInput").click());

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
              isViewingMyDay ? renderMyDay() : renderTasks();
              alert("Import successful!");
            } else {
              alert("Invalid JSON format.");
            }
          } catch {
            alert("Error parsing JSON file.");
          }
          $("#importFileInput").val("");
        };
        reader.readAsText(file);
      });

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

  // Render tasks for the "My Day" view
  function renderMyDay() {
    const taskSection = $("#taskSection");
    const noListMessage = $("#noListMessage");
    noListMessage.hide();
    taskSection.show();

    $("#currentListTitle").text("My Day");
    $("#editListBtn").hide();
    $("#addTaskBtn").hide();
    $("#completedToggle").hide();

    const taskList = $("#taskList").empty();
    const completedList = $("#completedTasks").empty();

    let completedCount = 0;

    data.lists.forEach((list, listIndex) => {
      list.tasks.forEach((task, taskIndex) => {
        // Show task if flagged for My Day or has dueDate/reminder today
        const showByDay = task.myDay || isToday(task.reminder) || isToday(task.dueDate);
        if (!showByDay) return;

        const taskEl = createTaskElement(task, list.color, isViewingMyDay);

        if (task.completed) {
          taskEl.addClass("task-complete");
          taskEl.find("input").prop("checked", true);
          completedList.append(taskEl);
          completedCount++;
        } else {
          taskList.append(taskEl);
          animateTaskInsert(taskEl);
        }

        setupTaskHandlers(taskEl, task, listIndex, taskIndex, renderMyDay);
      });
    });

    if (!taskList.children().length) {
      taskList.append(`<li class="list-group-item text-success fst-italic">🎉 Congratulations, your day is clear!</li>`);
    }
  }

  // Render tasks for a selected list
  function renderTasks() {
    if (currentListId === null) {
      renderMyDay();
      return;
    }

    isViewingMyDay = false;

    const taskSection = $("#taskSection");
    const noListMessage = $("#noListMessage");
    noListMessage.hide();
    taskSection.show();

    $("#addTaskBtn").show();
    $("#completedToggle").show();

    const list = data.lists[currentListId];
    $("#currentListTitle").text(list.title);
    $("#editListBtn")
      .show()
      .off("click")
      .on("click", () => {
        $("#editListTitle").val(list.title);
        $("#editListColor").val(list.color);
        $("#editListModal").modal("show");
      });

    const taskList = $("#taskList").empty();
    const completedList = $("#completedTasks").empty();

    let completedCount = 0;

    list.tasks.forEach((task, i) => {
      const taskEl = createTaskElement(task, list.color, isViewingMyDay);

      if (task.completed) {
        taskEl.addClass("task-complete");
        taskEl.find("input").prop("checked", true);
        completedList.append(taskEl);
        completedCount++;
      } else {
        taskList.append(taskEl);
        animateTaskInsert(taskEl);
      }

      setupTaskHandlers(taskEl, task, currentListId, i, renderTasks);
    });

    if (!taskList.children().length) {
      taskList.append(`<li class="list-group-item text-muted fst-italic">No tasks in this list yet.</li>`);
    }

    // Completed tasks toggle label
    const isVisible = $("#completedTasks").hasClass("show");
    const label = isVisible ? "Hide" : "Show";
    $("#completedToggle").text(`${label} Completed Tasks (${completedCount})`);

    // Make task list sortable (only incomplete tasks)
    taskList.sortable({
      update: function () {
        const newOrderTitles = taskList.children().map(function () {
          return $(this).text().trim();
        }).get();

        const reordered = [];
        newOrderTitles.forEach(title => {
          const task = list.tasks.find(t => !t.completed && t.title === title);
          if (task) reordered.push(task);
        });

        const completedTasks = list.tasks.filter(t => t.completed);
        list.tasks = [...reordered, ...completedTasks];
        saveData();
      },
    });
  }

  // Helper: create the DOM for a task element with icons
  function createTaskElement(task, color, showListColor) {
    const $taskEl = $(`
      <li class="list-group-item task-transition d-flex align-items-center justify-content-between list-group-item-action">
        <div class="d-flex align-items-center flex-grow-1">
          ${showListColor ? `<span class="list-color me-2" style="background:${color}"></span>` : ""}
          <input type="checkbox" class="form-check-input me-2"> ${task.title}
        </div>
      </li>
    `);
    const $icons = createTaskIcons(task);
    $taskEl.append($icons);
    return $taskEl;
  }

  // Helper: bind events to task element's checkbox and click
  function setupTaskHandlers($taskEl, task, listIndex, taskIndex, rerenderCallback) {
    // Checkbox change updates task completion and rerenders list
    $taskEl.find("input").change(function () {
      task.completed = this.checked;
      handleTaskCompletion(task, listIndex);
      $taskEl.slideUp(200, () => {
        saveData();
        rerenderCallback();
      });
    });

    // Click on task opens modal, except when clicking the checkbox
    $taskEl.click(function (e) {
      if (!$(e.target).is("input")) {
        currentListId = listIndex;
        openTaskModal(taskIndex);
      }
    });
  }

  // ----- Task Modal -----
  function openTaskModal(taskIndex) {
    const task = data.lists[currentListId].tasks[taskIndex];
    $("#taskTitleInput").val(task.title);
    $("#taskNotes").val(task.notes || "");
    $("#dueDate").val(task.dueDate || "");
    $("#reminder").val(task.reminder || "");
    $("#repeatOption").val(task.repeat || "none");
    $("#myDayCheckbox").prop("checked", task.myDay || false);

    $("#saveTaskChanges").off("click").on("click", () => {
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

  // ----- New List / Task Modals -----
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

  $("#confirmNewItem").click(() => {
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

  // ----- Task Completion & Recurring Logic -----
  function handleTaskCompletion(task, listIndex) {
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

  // ----- Reminder Notifications -----
  function checkReminders() {
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes ahead

    data.lists.forEach((list) => {
      list.tasks.forEach((task) => {
        if (task.reminder /*&& !task.reminderNotified */) {
          const reminderTime = new Date(task.reminder);
          if (reminderTime >= now && reminderTime <= soon) {
            showNotification(`Reminder: ${task.title}`, `From list: ${list.title}`);
            // task.reminderNotified = true; // prevent repeat
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

  // ----- UI Events -----
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

  $("#saveListChanges").on("click", () => {
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

  $("#newItemModal").on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission if any
      $("#confirmNewItem").click();
    } else if (e.key === "Escape") {
      $(this).modal("hide");
    }
  });

  // For Task edit modal
  $("#taskModal").on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      $("#saveTaskChanges").click();
    } else if (e.key === "Escape") {
      $(this).modal("hide");
    }
  });

  // For edit list modal
  $("#editListModal").on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      $("#saveListChanges").click();
    } else if (e.key === "Escape") {
      $(this).modal("hide");
    }
  });

  // ----- Dark mode toggle -----
  function applyDarkMode(enabled) {
    if (enabled) {
      $("head").attr("data-bs-theme", "dark");
      $("body").addClass("dark-mode");
      $("#darkModeToggle").prop("checked", true);
    } else {
      $("head").attr("data-bs-theme", "light");
      $("body").removeClass("dark-mode");
      $("#darkModeToggle").prop("checked", false);
    }
  }

  $(document).on("change", "#darkModeToggle", function () {
    const enabled = $(this).is(":checked");
    applyDarkMode(enabled);
    localStorage.setItem("darkMode", enabled);
  });

  // ----- Button Bindings -----
  $("#addListBtn").click(openNewListModal);
  $("#addTaskBtn").click(openNewTaskModal);

  // ----- Initialization -----
  (function init() {
    loadData();
    renderLists();
    renderMyDay();

    // Dark mode preference
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

    checkReminders();
    setInterval(checkReminders, 60000); // every 1 minute
  })();
});
