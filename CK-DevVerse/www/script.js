/* --- 1. BOOT SEQUENCE DATA ---
   These are the lines that print after axiom_start runs.
   I kept them plain so they are easy to tweak later. */
var todayText = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});
var bootLines = [
  "CK_OS v1.0 initializing...",
  todayText,
  "",
  "Loading about.sh........... OK",
  "Loading education.log...... OK",
  "Loading skills.db.......... OK",
  "Loading work.sh............ OK",
  "Loading projects.sh........ OK",
  "Loading research.sh........ OK",
  "",
  "All systems nominal. Welcome.",
];

var bootLog = document.getElementById("boot-log");
var heroContent = document.getElementById("hero-content");
var heroTerminal = document.querySelector(".hero-terminal");
var commandLine = document.getElementById("command-line");
var commandInput = document.getElementById("command-input");
var root = document.documentElement;

bootLog.textContent =
  "CK_OS v1.0 Terminal Ready\n" +
  todayText +
  '\n\nType "axiom_start" to initialize.\n\n';

heroTerminal.addEventListener("click", function () {
  commandInput.focus();
});

commandInput.addEventListener("keydown", function (e) {
  if (e.key !== "Enter") return;

  var rawCommand = commandInput.value;
  var command = rawCommand.trim().toLowerCase();

  if (command === "axiom_start") {
    // If the command is right, I echo it first, then start the fake boot.
    bootLog.textContent += "> " + rawCommand + "\n\n";
    commandLine.style.display = "none";
    setTimeout(function () {
      bootLog.textContent = "";
      printBootLine(0);
    }, 400);
  } else if (command === "") {
    // Empty enter just prints another prompt line, same as before.
    bootLog.textContent += "> \n";
  } else {
    // Wrong commands still get the bash-style error so the terminal vibe still works.
    bootLog.textContent += "> " + rawCommand + "\n";
    bootLog.textContent += "bash: " + command + ": command not found\n\n";
  }

  commandInput.value = "";
});

function finishBoot() {
  heroContent.classList.remove("hidden");
  heroContent.classList.add("visible");

  setTimeout(function () {
    document.body.classList.add("booted");
    root.classList.add("booted");
  }, 600);
}

function printBootLine(index) {
  if (index >= bootLines.length) {
    // Once the lines are done, I reveal the hero text and then the rest of the page.
    finishBoot();
    return;
  }

  bootLog.textContent += bootLines[index] + "\n";

  // Blank lines pause a bit less so the boot does not drag.
  setTimeout(
    function () {
      printBootLine(index + 1);
    },
    bootLines[index] === "" ? 200 : 300,
  );
}

/* --- 2b. HAMBURGER TOGGLE (mobile) ---
   Below 768px the nav collapses into a logo + a ☰ button. Tapping the
   button adds .nav-open to #main-nav, which CSS uses to reveal the link
   list as a vertical dropdown. Tapping a link closes the dropdown again
   so the menu does not stay open over the section the user jumped to. */
var navToggle = document.getElementById("nav-toggle");
var mainNav = document.getElementById("main-nav");

if (navToggle) {
  navToggle.addEventListener("click", function () {
    var isOpen = mainNav.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
}

/* --- 3. SMOOTH SCROLL ---
   This keeps the nav clicks from doing the hard anchor jump. */
var navLinks = document.querySelectorAll("#main-nav a");

navLinks.forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    var targetId = this.getAttribute("href").substring(1);
    var targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.scrollIntoView({ behavior: "smooth" });
    // Close the hamburger dropdown after navigating (mobile only).
    if (mainNav && mainNav.classList.contains("nav-open")) {
      mainNav.classList.remove("nav-open");
      if (navToggle) navToggle.setAttribute("aria-expanded", "false");
    }
  });
});

/* --- 4. ACTIVE NAV HIGHLIGHT ---
   IntersectionObserver watches each section and lights up
   the matching nav link while that section is in view. */
var sections = document.querySelectorAll("section, #hero");
var observer = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) setActiveLink(entry.target.getAttribute("id"));
    });
  },
  { root: null, rootMargin: "-60px 0px -40% 0px", threshold: 0.1 },
);

sections.forEach(function (section) {
  observer.observe(section);
});

function setActiveLink(id) {
  navLinks.forEach(function (link) {
    link.classList.remove("active");
  });

  var matchingLink = document.querySelector('#main-nav a[href="#' + id + '"]');
  if (matchingLink) matchingLink.classList.add("active");
}

/* --- 5. CONTACT FORM HANDLER ---
   On submit I clear the form and print the same terminal-style reply below it. */
var contactForm = document.getElementById("contact-form");
var formOutput = document.getElementById("form-output");

contactForm.addEventListener("submit", function (e) {
  e.preventDefault();
  contactForm.reset();

  var line = document.createElement("p");
  line.textContent = "> MESSAGE SENT. AWAITING RESPONSE... \u2588";
  formOutput.appendChild(line);
});
