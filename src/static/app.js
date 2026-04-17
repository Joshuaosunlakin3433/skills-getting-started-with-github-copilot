document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  const confirmToast = document.createElement("div");
  confirmToast.className = "confirm-toast hidden";
  confirmToast.innerHTML = `
    <div class="confirm-toast-card" role="alertdialog" aria-modal="true" aria-live="assertive">
      <p class="confirm-toast-text"></p>
      <div class="confirm-toast-actions">
        <button type="button" class="toast-btn toast-cancel-btn">Cancel</button>
        <button type="button" class="toast-btn toast-confirm-btn">Remove</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmToast);

  const confirmToastText = confirmToast.querySelector(".confirm-toast-text");
  const confirmToastCancelBtn = confirmToast.querySelector(".toast-cancel-btn");
  const confirmToastConfirmBtn = confirmToast.querySelector(".toast-confirm-btn");
  let confirmResolver = null;
  let hideMessageTimeoutId = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showMessage(text, type) {
    if (hideMessageTimeoutId) {
      clearTimeout(hideMessageTimeoutId);
    }

    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    hideMessageTimeoutId = setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function closeConfirmToast(confirmed) {
    confirmToast.classList.add("hidden");
    if (confirmResolver) {
      confirmResolver(confirmed);
      confirmResolver = null;
    }
  }

  function showUnregisterConfirmToast(email, activity) {
    confirmToastText.textContent = `Remove ${email} from ${activity}?`;
    confirmToast.classList.remove("hidden");
    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }

  confirmToastCancelBtn.addEventListener("click", () => closeConfirmToast(false));
  confirmToastConfirmBtn.addEventListener("click", () => closeConfirmToast(true));

  confirmToast.addEventListener("click", (event) => {
    if (event.target === confirmToast) {
      closeConfirmToast(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !confirmToast.classList.contains("hidden")) {
      closeConfirmToast(false);
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch(`/activities?ts=${Date.now()}`, { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participants = details.participants || [];
        const participantsMarkup = participants.length
          ? participants
              .map(
                (participant) => `
                <li class="participant-item">
                  <span class="participant-email">${escapeHtml(participant)}</span>
                  <button
                    type="button"
                    class="participant-delete-btn"
                    data-activity="${escapeHtml(name)}"
                    data-email="${escapeHtml(participant)}"
                    aria-label="Unregister ${escapeHtml(participant)}"
                    title="Unregister participant"
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </li>`
              )
              .join("")
          : "<li class=\"empty\">No participants yet</li>";

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p class="participants-title"><strong>Participants</strong></p>
            <ul class="participants-list">
              ${participantsMarkup}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Handle unregister action from participants list
  activitiesList.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(".participant-delete-btn");
    if (!deleteButton) {
      return;
    }

    const activity = deleteButton.dataset.activity;
    const email = deleteButton.dataset.email;

    if (!activity || !email) {
      return;
    }

    const confirmed = await showUnregisterConfirmToast(email, activity);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        await fetchActivities();
      } else {
        showMessage(result.detail || "Failed to unregister participant", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister participant. Please try again.", "error");
      console.error("Error unregistering participant:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
