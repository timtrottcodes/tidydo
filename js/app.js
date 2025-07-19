// app.js

$(document).ready(function () {
    let data = {
      lists: [],
      myDay: []
    };
    let currentListId = null;
    let isCreatingList = false;
    let isCreatingTask = false;
  
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
      data.lists.forEach((list, index) => {
        const item = $(`
          <li class="list-group-item d-flex align-items-center">
            <span class="list-color" style="background:${list.color}"></span>${list.title}
          </li>`);
        item.click(() => {
          currentListId = index;
          renderTasks();
        });
        container.append(item);
      });
    }
  
    function animateTaskInsert($el) {
      $el.css({ opacity: 0, transform: 'translateY(-10px)' });
      setTimeout(() => $el.css({ transition: 'all 0.3s', opacity: 1, transform: 'translateY(0)' }), 10);
    }
  
    function renderTasks() {
      const $taskSection = $("#taskSection");
      const $noListMessage = $("#noListMessage");
  
      if (currentListId === null) {
        $taskSection.fadeOut(200, () => {
          $noListMessage.fadeIn(200);
        });
        return;
      } else {
        $noListMessage.fadeOut(200, () => {
          $taskSection.fadeIn(200);
        });
      }
  
      const list = data.lists[currentListId];
      $("#currentListTitle").text(list.title);
  
      const $taskList = $("#taskList");
      const $completedList = $("#completedTasks");
      const $completedToggle = $("#completedToggle");
      const completedCollapse = bootstrap.Collapse.getOrCreateInstance($completedList[0], { toggle: false });
  
      $taskList.empty();
      $completedList.empty();
  
      let completedCount = 0;
  
      list.tasks.forEach((task, i) => {
        const $taskEl = $(`
          <li class="list-group-item task-transition">
            <input type="checkbox" class="form-check-input me-2"> ${task.title}
          </li>`);
        
        if (task.completed) {
          $taskEl.addClass("task-complete");
          $taskEl.find("input").prop("checked", true);
          $completedList.append($taskEl);
          completedCount++;
        } else {
          $taskList.append($taskEl);
          animateTaskInsert($taskEl);
        }
  
        $taskEl.find("input").change(function () {
          task.completed = this.checked;
          $(this).closest('li').slideUp(200, () => {
            saveData();
            renderTasks();
          });
        });
  
        $taskEl.click(function (e) {
          if (!$(e.target).is("input")) openTaskModal(i);
        });
      });
  
      // Update completed toggle text with count and visibility
      const isVisible = $completedList.hasClass("show");
      const label = isVisible ? "Hide" : "Show";
      $completedToggle.text(`${label} Completed Tasks (${completedCount})`);
  
      // Enable sortable drag-and-drop
      $taskList.sortable({
        update: function () {
          const newOrder = $taskList.children().map(function () {
            return $(this).text().trim();
          }).get();
  
          const reordered = [];
          newOrder.forEach(title => {
            const task = list.tasks.find(t => !t.completed && t.title === title);
            if (task) reordered.push(task);
          });
  
          const completed = list.tasks.filter(t => t.completed);
          list.tasks = [...reordered, ...completed];
          saveData();
        }
      });
    }
  
    // jQuery events for Bootstrap collapse on completed tasks
    const $completedTasks = $("#completedTasks");
    const $completedToggle = $("#completedToggle");
    const collapseInstance = bootstrap.Collapse.getOrCreateInstance($completedTasks[0], { toggle: false });
  
    $completedTasks.on('shown.bs.collapse', () => {
      $completedToggle.text((i, oldText) => oldText.replace("Show", "Hide"));
    });
  
    $completedTasks.on('hidden.bs.collapse', () => {
      $completedToggle.text((i, oldText) => oldText.replace("Hide", "Show"));
    });
  
    $completedToggle.on("click", function () {
      if ($completedTasks.hasClass("show")) {
        collapseInstance.hide();
      } else {
        collapseInstance.show();
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
  
      $("#saveTaskChanges").off("click").on("click", function () {
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
        renderTasks();
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
  
    $("#addListBtn").click(openNewListModal);
    $("#addTaskBtn").click(openNewTaskModal);
  
    // --- Modal keyboard handling for Enter (submit) and Esc (close) ---
  
    $("#newItemModal").on("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        $("#confirmNewItem").click();
      } else if (e.key === "Escape") {
        $(this).modal("hide");
      }
    });
  
    $("#taskModal").on("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        $("#saveTaskChanges").click();
      } else if (e.key === "Escape") {
        $(this).modal("hide");
      }
    });
  
    // ---
  
    loadData();
    renderLists();
    renderTasks();
  });
  