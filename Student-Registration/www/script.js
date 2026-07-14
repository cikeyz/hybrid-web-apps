/* --- 1. ELEMENTS ---
   I grabbed the main elements once up here so the rest of the file stays easier to follow.
*/
const form = document.getElementById("registration-form");
const firstNameInput = document.getElementById("fname");
const submissionIdField = document.getElementById("submission_id");
const submissionIdBottomField = document.getElementById("submission_id_bottom");
const profilePhotoInput = document.getElementById("profile_photo");
const photoPreview = document.getElementById("photo-preview");
const photoPlaceholder = document.getElementById("photo-placeholder");
const schoolDocsInput = document.getElementById("school_docs");
const schoolDocsName = document.getElementById("school-docs-filename");
const passwordInput = document.getElementById("password");
const strengthBars = document.querySelectorAll("#pwd-strength .bar");
const strengthLabel = document.querySelector("#pwd-strength .strength-label");
const passwordToggles = document.querySelectorAll(".pwd-toggle");
const resetButton = document.getElementById("reset-btn");
const floatingGroups = document.querySelectorAll(".floating-group");
const stepperButtons = document.querySelectorAll("#section-stepper button");
const formSections = document.querySelectorAll("fieldset.form-section");

/* --- 2. SHARED LISTS ---
   These little lists keep the repeated limits and field checks in one place.
*/
const counterConfigs = [
  {
    input: document.getElementById("short_bio"),
    counter: document.getElementById("bio-counter"),
    limit: 200,
  },
  {
    input: document.getElementById("additional_notes"),
    counter: document.getElementById("notes-counter"),
    limit: 300,
  },
];
const requiredFieldIds = [
  "fname",
  "lname",
  "dob",
  "email",
  "username",
  "age",
  "password",
  "confirm_password",
];
const stepperState = {
  isClickScrolling: false,
  scrollTimeout: null,
  currentId: "",
};

/* --- 3. STARTUP ---
   I run the setup once here so the page is ready before the user starts filling the form out.
*/
if (form) initForm();

/* This sets the starting page state so the rest of the handlers can stay simple. */
function initForm() {
  setSubmissionId();
  bindEvents();
  for (const config of counterConfigs) refreshCounter(config.input);
  initFloatingLabels();
  paintPasswordStrength(0);
  updateSchoolDocsName();
  updatePhotoPreview();
  initSectionStepper();
  if (firstNameInput) firstNameInput.focus();
}
/* This writes the same submission ID into both hidden fields so the form stays in sync. */
function setSubmissionId() {
  const submissionId = "SUB-" + Date.now();
  if (submissionIdField) submissionIdField.value = submissionId;
  if (submissionIdBottomField) submissionIdBottomField.value = submissionId;
}
/* This connects the page events in one spot so the setup is easier to trace. */
function bindEvents() {
  if (profilePhotoInput)
    profilePhotoInput.addEventListener("change", updatePhotoPreview);
  if (schoolDocsInput)
    schoolDocsInput.addEventListener("change", updateSchoolDocsName);
  if (passwordInput)
    passwordInput.addEventListener("input", handlePasswordInput);
  if (resetButton) resetButton.addEventListener("click", handleResetClick);
  form.addEventListener("submit", handleFormSubmit);
  for (const toggle of passwordToggles)
    toggle.addEventListener("click", togglePasswordVisibility);
  for (const config of counterConfigs) {
    if (config.input && config.counter)
      config.input.addEventListener("input", handleCounterInput);
  }
}
/* This shows the selected photo right away when the chosen file is a valid image. */
function updatePhotoPreview() {
  if (!profilePhotoInput || !photoPreview || !photoPlaceholder) return;
  const file = profilePhotoInput.files[0];
  if (file && file.type.startsWith("image/")) {
    photoPreview.src = URL.createObjectURL(file);
    photoPreview.style.display = "block";
    photoPlaceholder.style.display = "none";
    return;
  }
  photoPreview.removeAttribute("src");
  photoPreview.style.display = "none";
  photoPlaceholder.style.display = "block";
}
/* This prints the school document name so the user can check the upload at a glance. */
function updateSchoolDocsName() {
  if (!schoolDocsInput || !schoolDocsName) return;
  schoolDocsName.textContent =
    schoolDocsInput.files.length > 0
      ? schoolDocsInput.files[0].name
      : "no file selected";
}
/* This refreshes only the counter that belongs to the textarea the user just changed. */
function handleCounterInput(event) {
  refreshCounter(event.currentTarget);
}
/* This updates one counter and flips the warning style if the text goes over the limit. */
function refreshCounter(input) {
  for (const config of counterConfigs) {
    if (config.input !== input || !config.counter) continue;
    const length = input.value.length;
    config.counter.textContent = length + " / " + config.limit + " characters";
    config.counter.classList.toggle("limit-reached", length > config.limit);
    break;
  }
}
/* This switches the password field between hidden and visible so the text is easier to verify. */
function togglePasswordVisibility(event) {
  const toggle = event.currentTarget;
  const input = document.getElementById(toggle.getAttribute("data-target"));
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    toggle.textContent = "hide";
  } else {
    input.type = "password";
    toggle.textContent = "show";
  }
}
/* This recalculates the password meter every time the main password field changes. */
function handlePasswordInput() {
  if (!passwordInput) return;
  paintPasswordStrength(getPasswordScore(passwordInput.value));
}
/* This keeps the same password scoring rules the old file was already using. */
function getPasswordScore(value) {
  let score = 0;
  if (value.length > 0 && value.length < 8) score = 1;
  if (value.length >= 8) {
    score = 2;
    if (/[A-Z]/.test(value) && /[0-9]/.test(value)) score = 3;
    if (/[^a-zA-Z0-9]/.test(value)) score = 4;
  }
  return score;
}
/* This paints the bars and label so the strength feedback stays easy to read. */
function paintPasswordStrength(score) {
  let count = 0;
  let color = "var(--color-text-muted)";
  let label = "";
  for (const bar of strengthBars)
    bar.style.backgroundColor = "var(--color-border)";
  if (score === 1) {
    count = 1;
    color = "var(--color-error)";
    label = "too short";
  } else if (score === 2) {
    count = 2;
    color = "var(--color-accent)";
    label = "weak";
  } else if (score === 3) {
    count = 3;
    color = "#D4A017";
    label = "fair";
  } else if (score === 4) {
    count = 4;
    color = "var(--color-success)";
    label = "strong";
  }
  for (let i = 0; i < count; i += 1) {
    if (strengthBars[i]) strengthBars[i].style.backgroundColor = color;
  }
  if (strengthLabel) {
    strengthLabel.style.color = color;
    strengthLabel.textContent = label;
  }
}
/* This runs the custom reset work because the native reset does not clear the extra UI states. */
function handleResetClick() {
  form.reset();
  resetCustomUi();
}
/* This clears the custom visuals so the form really looks reset after the button is pressed. */
function resetCustomUi() {
  clearValidationState();
  updatePhotoPreview();
  updateSchoolDocsName();
  for (const config of counterConfigs) refreshCounter(config.input);
  for (const group of floatingGroups) group.classList.remove("float-active");
  paintPasswordStrength(0);
}
/* This removes the old error messages and red classes before the next validation pass runs. */
function clearValidationState() {
  const errorMessages = document.querySelectorAll(".error-msg");
  const errorFields = document.querySelectorAll(".input-error");
  for (const message of errorMessages) message.remove();
  for (const field of errorFields) field.classList.remove("input-error");
}
/* This stops the normal submit first so the script can validate the form on the page. */
function handleFormSubmit(event) {
  event.preventDefault();
  clearValidationState();
  const validation = validateForm();
  if (!validation.isValid && validation.firstErrorField) {
    validation.firstErrorField.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    return;
  }
  /* The form has no backend (action="#"), and the original form.submit()
     call would navigate the WebView to a blank "#" URL when packaged as
     an APK. Since validation passed, we show an inline success banner
     and stop here - the data is already captured in the fields. */
  showSubmitSuccess();
}

/* Shows a dismissible success banner at the top of the form after a
   valid submit, then scrolls it into view. Uses the existing color
   tokens from the page so it matches the notebook look. */
function showSubmitSuccess() {
  let banner = document.getElementById("submit-success");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "submit-success";
    banner.setAttribute("role", "status");
    banner.style.cssText =
      "margin:0 0 16px;padding:12px 16px;border:1px solid var(--color-success);" +
      "border-radius:6px;background:var(--color-accent-light);" +
      "color:var(--color-success);font-size:var(--text-sm);" +
      "font-family:'DM Mono',monospace;";
    form.prepend(banner);
  }
  banner.textContent =
    "> Registration captured (submission ID " +
    (submissionIdField ? submissionIdField.value : "") +
    "). No backend connected - data stays on this device.";
  banner.scrollIntoView({ behavior: "smooth", block: "start" });
}
/* This checks the required fields, email, passwords, and interest checkboxes before submit. */
function validateForm() {
  const result = { isValid: true, firstErrorField: null };
  for (const id of requiredFieldIds) {
    const field = document.getElementById(id);
    if (field && !field.value.trim())
      markInvalid(result, field, "This field is required.");
  }

  const emailField = document.getElementById("email");
  if (
    emailField &&
    emailField.value.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)
  ) {
    markInvalid(result, emailField, "Please enter a valid email.");
  }

  const confirmPasswordField = document.getElementById("confirm_password");
  if (
    passwordInput &&
    passwordInput.value.trim() &&
    passwordInput.value.length < 8
  ) {
    if (!passwordInput.classList.contains("input-error")) {
      markInvalid(
        result,
        passwordInput,
        "Password must be at least 8 characters.",
      );
    }
  }

  if (
    passwordInput &&
    confirmPasswordField &&
    confirmPasswordField.value.trim() &&
    confirmPasswordField.value !== passwordInput.value &&
    !confirmPasswordField.classList.contains("input-error")
  ) {
    markInvalid(result, confirmPasswordField, "Passwords do not match.");
  }

  if (
    document.querySelectorAll('input[name="interests[]"]:checked').length === 0
  ) {
    markInvalid(result, null, "Please select at least one interest.", true);
  }

  return result;
}
/* This drops an error message in the right place and remembers the first field that failed. */
function markInvalid(result, input, message, isGroup) {
  result.isValid = false;

  if (isGroup) {
    const anchor = document.getElementById("interests-error-anchor");
    const checkboxGrid = document.querySelector(".checkbox-grid");
    if (anchor) {
      const error = document.createElement("span");
      error.className = "error-msg";
      error.textContent = message;
      anchor.appendChild(error);
    }
    if (!result.firstErrorField && checkboxGrid)
      result.firstErrorField = checkboxGrid;
    return;
  }

  if (!input) return;
  input.classList.add("input-error");
  const error = document.createElement("span");
  error.className = "error-msg";
  error.textContent = message;
  const parentGroup = input.closest(".input-group") || input.parentNode;
  parentGroup.appendChild(error);
  if (!result.firstErrorField) result.firstErrorField = input;
}
/* This attaches the floating-label listeners and sets the starting label positions. */
function initFloatingLabels() {
  for (const group of floatingGroups) {
    const input = group.querySelector("input");
    if (!input) continue;
    syncFloatingLabel(input);
    input.addEventListener("focus", syncFloatingLabel);
    input.addEventListener("blur", syncFloatingLabel);
    input.addEventListener("input", syncFloatingLabel);
  }
}
/* This decides if one floating label should stay lifted or sit back on the line. */
function syncFloatingLabel(source) {
  const input = source.currentTarget || source;
  const group = input.closest(".floating-group");
  if (!group) return;

  if (
    input.value.trim() !== "" ||
    document.activeElement === input ||
    input.type === "date" ||
    input.hasAttribute("placeholder")
  ) {
    group.classList.add("float-active");
  } else {
    group.classList.remove("float-active");
  }
}
/* This sets up the mini stepper so the buttons can scroll and track the active form section. */
function initSectionStepper() {
  if (!stepperButtons.length || !formSections.length) return;
  for (const button of stepperButtons)
    button.addEventListener("click", handleStepButtonClick);
  if (!window.IntersectionObserver) return;

  const observer = new IntersectionObserver(handleSectionIntersection, {
    rootMargin: "-10% 0px -60% 0px",
  });
  for (const section of formSections) observer.observe(section);
  window.addEventListener("scroll", handlePageScroll);
}
/* This updates the active step while the user scrolls through the form normally. */
function handleSectionIntersection(entries) {
  if (stepperState.isClickScrolling) return;
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    stepperState.currentId = entry.target.id;
    const atBottom =
      Math.ceil(window.innerHeight + window.scrollY) >=
      document.documentElement.scrollHeight - 5;
    if (!atBottom) setActiveStep(stepperState.currentId);
  }
}
/* This scrolls to the clicked section and holds the active state while the smooth scroll finishes. */
function handleStepButtonClick(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const targetId = button.getAttribute("data-target");
  const targetSection = document.getElementById(targetId);
  stepperState.isClickScrolling = true;
  window.clearTimeout(stepperState.scrollTimeout);
  setActiveStep(targetId);
  if (targetSection)
    targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
  stepperState.scrollTimeout = window.setTimeout(unlockStepper, 800);
}
/* This releases the stepper lock after the click-based smooth scroll should already be done. */
function unlockStepper() {
  stepperState.isClickScrolling = false;
}
/* This makes sure the last step still lights up when the page is already at the bottom. */
function handlePageScroll() {
  if (stepperState.isClickScrolling) return;
  const atBottom =
    Math.ceil(window.innerHeight + window.scrollY) >=
    document.documentElement.scrollHeight - 5;
  if (atBottom) {
    const lastButton = stepperButtons[stepperButtons.length - 1];
    if (lastButton) setActiveStep(lastButton.getAttribute("data-target"));
    return;
  }
  if (stepperState.currentId) setActiveStep(stepperState.currentId);
}
/* This swaps the active class on the stepper buttons so only the matching one stays highlighted. */
function setActiveStep(targetId) {
  for (const button of stepperButtons) {
    if (button.getAttribute("data-target") === targetId) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  }
}
