/* --- 1. LRC DATA (the lyrics + timestamps) ---
   This uses an LRC-style format where the whole line has a timestamp
   and each word can also have its own timestamp inside angle brackets.
   That is what makes the per-word karaoke highlighting possible.

   I kept the lyrics directly in this file as a template literal instead of
   loading them from another file. That avoids file:// CORS issues when
   opening index.html directly without running a local server. */

const LRC_DATA = `[00:00.00]<00:00.00>♪ Instrumental ♪
[00:12.67]<00:12.67>Sintang <00:13.73>Paaralan
[00:15.32]<00:15.32>Tanglaw <00:15.89>ka <00:16.45>ng <00:17.14>bayan
[00:18.69]<00:18.69>Pandayan <00:19.85>ng <00:20.35>isip <00:21.84>ng <00:22.45>kabataan
[00:24.46]<00:24.46>Kami <00:25.14>ay <00:25.43>dumating <00:26.54>nang <00:26.96>salat <00:28.16>sa <00:28.52>yaman
[00:29.88]<00:29.88>Hanap <00:30.10>na <00:30.55>dunong <00:32.48>ay <00:33.18>iyong <00:33.48>alay
[00:36.00]<00:36.00>Ang <00:36.20>layunin <00:38.25>mong <00:39.11>makatao
[00:41.87]<00:41.87>Dinarangal <00:44.16>ang <00:44.75>Pilipino
[00:47.88]<00:47.88>Ang <00:48.13>iyong <00:48.53>aral, <00:49.77>diwa, <00:50.91>adhikang <00:52.41>taglay
[00:53.30]<00:53.30>PUP, <00:54.67>aming <00:55.57>gabay
[00:56.51]<00:56.51>Paaralang <00:58.98>dakila
[01:02.13]<01:02.13>PUP, <01:04.25>pinagpala
[01:08.64]<01:08.64>Gagamitin <01:11.06>ang <01:12.05>karunungan
[01:14.34]<01:14.34>Mula <01:15.01>sa <01:15.48>iyo, <01:17.30>para <01:18.17>sa <01:18.57>bayan
[01:20.57]<01:20.57>Ang <01:21.10>iyong <01:21.17>aral, <01:22.57>diwa, <01:24.12>adhikang <01:25.40>taglay
[01:25.99]<01:25.99>PUP, <01:27.32>aming <01:28.47>gabay
[01:29.23]<01:29.23>Paaralang <01:32.18>dakila
[01:34.90]<01:34.90>PUP, <01:37.85>pinagpala`;

/* --- 2. DOM REFERENCES ---
   I grab these elements once at the start so the script can reuse them
   instead of repeatedly calling getElementById later on. */
const audioEl = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const rewindBtn = document.getElementById("rewind-btn");
const forwardBtn = document.getElementById("forward-btn");
const iconPlay = document.getElementById("iconPlay");
const iconPause = document.getElementById("iconPause");
const lyricsPanel = document.getElementById("lyricsPanel");
const progressContainer = document.getElementById("progressContainer");
const progressFill = document.getElementById("progressFill");
const timeCurrent = document.getElementById("timeCurrent");
const timeTotal = document.getElementById("timeTotal");

/* --- 3. STATE ---
   These variables keep track of the current playback and lyric state.
   I used `var` here for simpler ES5-style compatibility in this project. */
var allWords = []; // Flat array of every word: [{text, time, lineIdx}, ...]
var wordElements = []; // Parallel array of <span> DOM elements for each word
var activeWordIdx = -1; // Index of the currently highlighted word (-1 = none)
var activeLineIdx = -1; // Index of the currently active line (-1 = none)
var isUserScrolling = false; // True when user manually scrolled lyrics (pauses auto-scroll)
var scrollResumeTimer = null; // setTimeout ID for resuming auto-scroll after 4s

var audioBackend = {
  isCordova: false,
  media: null,
  pollTimer: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,

  // Event callbacks (assigned later)
  onplay: null,
  onpause: null,
  ontimeupdate: null,
  onloadedmetadata: null,
  onended: null,

  init: function () {
    var self = this;
    function chooseBackend() {
      // The global Media constructor is injected by cordova-plugin-media.
      // In a desktop browser it is undefined, so we use HTML5 audio instead.
      if (typeof Media !== "undefined" && typeof cordova !== "undefined") {
        self.isCordova = true;
        self._disableHtml5Audio();
        self._initCordovaMedia();
      } else {
        console.log("PUP-Hymn: falling back to HTML5 audio backend");
        self._initHtml5Audio();
      }
    }
    // Media is not guaranteed to exist until Cordova's native bridge fires
    // deviceready. Initializing earlier can silently fall back to HTML5
    // audio inside the APK, where seeking is broken.
    if (typeof cordova !== "undefined") {
      document.addEventListener("deviceready", chooseBackend, false);
    } else {
      chooseBackend();
    }
  },

  _disableHtml5Audio: function () {
    // The <audio> element is only for the XAMPP/browser preview. Inside the
    // APK it can still preload and fight Cordova Media, so drop its src.
    audioEl.removeAttribute("src");
    audioEl.removeAttribute("preload");
  },

  _initCordovaMedia: function () {
    var self = this;

    // Absolute asset path removes ambiguity about what directory the Media
    // plugin resolves relative paths from inside the APK.
    var mediaSrc = "/android_asset/www/assets/PUP-Hymn.mp3";
    console.log("PUP-Hymn: Cordova Media src=" + mediaSrc);

    this.media = new Media(
      mediaSrc,
      function () {
        // Playback reached the end (or media released).
        console.log("PUP-Hymn: Media success/end callback");
        self.isPlaying = false;
        self._stopPoll();
        if (self.onended) self.onended();
      },
      function (err) {
        console.error("PUP-Hymn: Cordova Media error:", JSON.stringify(err));
      },
      function (status) {
        // MEDIA_RUNNING = 2, MEDIA_PAUSED = 3, MEDIA_STOPPED = 4
        console.log("PUP-Hymn: Media status=" + status);
        if (status === Media.MEDIA_RUNNING) {
          self.isPlaying = true;
          self._startPoll();
          if (self.onplay) self.onplay();
        } else if (
          status === Media.MEDIA_PAUSED ||
          status === Media.MEDIA_STOPPED
        ) {
          self.isPlaying = false;
          self._stopPoll();
          if (self.onpause) self.onpause();
        }
      }
    );

    // Duration is not available immediately; nudge it after a short delay.
    setTimeout(function () {
      self._refreshDuration();
      console.log("PUP-Hymn: initial duration=" + self.getDuration());
      if (self.onloadedmetadata) self.onloadedmetadata();
    }, 300);
  },

  _initHtml5Audio: function () {
    var self = this;

    audioEl.addEventListener("play", function () {
      self.isPlaying = true;
      if (self.onplay) self.onplay();
    });

    audioEl.addEventListener("pause", function () {
      self.isPlaying = false;
      if (self.onpause) self.onpause();
    });

    audioEl.addEventListener("timeupdate", function () {
      self.currentTime = audioEl.currentTime || 0;
      if (self.ontimeupdate) self.ontimeupdate();
    });

    audioEl.addEventListener("loadedmetadata", function () {
      self.duration = audioEl.duration || 0;
      if (self.onloadedmetadata) self.onloadedmetadata();
    });

    audioEl.addEventListener("ended", function () {
      self.isPlaying = false;
      if (self.onended) self.onended();
    });

    // Preload metadata so the seek bar and total-time label work immediately.
    audioEl.load();
  },

  play: function () {
    if (this.isCordova) {
      this.media.play();
      this.isPlaying = true;
      this._startPoll();
    } else {
      audioEl.play();
    }
  },

  pause: function () {
    if (this.isCordova) {
      this.media.pause();
      this.isPlaying = false;
      this._stopPoll();
    } else {
      audioEl.pause();
    }
  },

  // Seek to a target time in seconds. Always clamps to [0, duration].
  seek: function (seconds) {
    if (typeof seconds !== "number" || isNaN(seconds)) return;
    var target = Math.max(0, seconds);
    var duration = this.getDuration();
    if (duration > 0) target = Math.min(target, duration);
    console.log(
      "PUP-Hymn: seek requested=" + seconds +
      " clamped=" + target +
      " duration=" + duration +
      " isCordova=" + this.isCordova
    );

    if (this.isCordova) {
      // Cordova Media seekTo takes milliseconds.
      this.media.seekTo(target * 1000);
      this.currentTime = target;
      console.log("PUP-Hymn: media.seekTo(" + (target * 1000) + ")");
    } else {
      audioEl.currentTime = target;
    }
  },

  getDuration: function () {
    if (this.isCordova) {
      // getDuration() can return -1 until the file is ready; cache the
      // first positive value we see.
      var dur = this.media.getDuration();
      if (dur > 0) this.duration = dur;
      return this.duration;
    }
    return audioEl.duration || 0;
  },

  getCurrentTime: function () {
    if (this.isCordova) {
      return this.currentTime;
    }
    return audioEl.currentTime || 0;
  },

  _startPoll: function () {
    var self = this;
    this._stopPoll();
    this.pollTimer = setInterval(function () {
      self.media.getCurrentPosition(
        function (pos) {
          if (pos >= 0) {
            self.currentTime = pos;
            self._refreshDuration();
            if (self.ontimeupdate) self.ontimeupdate();
          }
        },
        function (err) {
          console.error("PUP-Hymn: getCurrentPosition error:", err);
        }
      );
    }, 250);
  },

  _stopPoll: function () {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  },

  _refreshDuration: function () {
    var dur = this.media.getDuration();
    if (dur > 0 && dur !== this.duration) {
      this.duration = dur;
      console.log("PUP-Hymn: Media duration updated to " + dur);
      if (this.onloadedmetadata) this.onloadedmetadata();
    } else if (this.duration <= 0) {
      // If the plugin never reports a duration, fall back to the last LRC
      // timestamp plus a short tail so the seek bar still has a total.
      var fallback = getFallbackDuration();
      if (fallback > 0) {
        this.duration = fallback;
        console.log("PUP-Hymn: using fallback duration " + fallback);
        if (this.onloadedmetadata) this.onloadedmetadata();
      }
    }
  }
};

function parseLRC(text) {
  var lines = text.trim().split("\n");
  var result = [];

  lines.forEach(function (line) {
    var lineMatch = line.match(/^\[(\d+):(\d+\.\d+)\]/);
    if (!lineMatch) return;
    var lineTime = parseInt(lineMatch[1]) * 60 + parseFloat(lineMatch[2]);

    var wordRegex = /<(\d+):(\d+\.\d+)>([^<\[]*)/g;
    var words = [];
    var m;
    while ((m = wordRegex.exec(line)) !== null) {
      var time = parseInt(m[1]) * 60 + parseFloat(m[2]);
      var wordText = m[3].trim();
      if (wordText) words.push({ text: wordText, time: time });
    }

    if (words.length > 0) {
      var lineText = words
        .map(function (w) {
          return w.text;
        })
        .join(" ");
      var hasInstrumentalMarker =
        lineText.indexOf("Instrumental") >= 0 || lineText.indexOf("♪") >= 0;
      result.push({
        time: lineTime,
        words: words,
        isInstrumental: hasInstrumentalMarker,
      });
    }
  });

  return result;
}

/* --- 6. RENDER LYRICS ---
   This builds the lyric elements inside the lyrics panel.
   Each line becomes a <div class="lyric-line"> and each word gets its own span.

   The spacer divs at the top and bottom give enough room for the first and
   last lines to still scroll into the middle of the panel.

   Every word is also clickable, so clicking it jumps the audio to that word
   and starts playback from there. */
function renderLyrics(data) {
  lyricsPanel.innerHTML = "";
  allWords = [];
  wordElements = [];

  // Small helper for the top/bottom spacer blocks used in centering.
  // The bottom spacer gets a larger height (see .spacer-bottom in CSS)
  // so the last line can still center during playback, while the top
  // spacer stays short to avoid dead space above line 0 at startup.
  function addSpacer(position) {
    var s = document.createElement("div");
    s.className = "lyrics-spacer";
    if (position === "bottom") s.classList.add("spacer-bottom");
    lyricsPanel.appendChild(s);
  }

  addSpacer("top"); // top spacer

  data.forEach(function (line, lineIdx) {
    var lineEl = document.createElement("div");
    lineEl.className = "lyric-line";
    if (line.isInstrumental) lineEl.classList.add("instrumental");

    line.words.forEach(function (word, wordIdx) {
      word.lineIdx = lineIdx;
      var span = document.createElement("span");
      span.className = "word";
      span.textContent = word.text;

      // Clicking a word jumps right to that exact timestamp.
      // With the Cordova Media backend this uses native seekTo, which
      // actually works; with the HTML5 backend it uses audio.currentTime.
      span.addEventListener("click", function () {
        audioBackend.seek(word.time);
        syncLyrics(word.time);
        if (!audioBackend.isPlaying) audioBackend.play();
      });

      lineEl.appendChild(span);
      if (wordIdx < line.words.length - 1) {
        lineEl.appendChild(document.createTextNode(" "));
      }

      allWords.push(word);
      wordElements.push(span);
    });

    lyricsPanel.appendChild(lineEl);
  });

  addSpacer("bottom"); // bottom spacer (tall, for end-of-song centering)
}

function scrollToLine(lineEl) {
  if (!lineEl || isUserScrolling) return;
  var panelHeight = lyricsPanel.clientHeight;
  var targetScroll =
    lineEl.offsetTop - panelHeight / 2 + lineEl.offsetHeight / 2;
  lyricsPanel.scrollTo({ top: targetScroll, behavior: "smooth" });
}

/* --- 8. PAUSE AUTO-SCROLL ON MANUAL SCROLL ---
   If the user scrolls the lyrics panel on purpose, auto-centering pauses
   for 4 seconds first. That way the panel does not snap back immediately
   while the user is trying to read ahead or look around.

   { passive: true } tells the browser this listener will not block scrolling,
   which helps keep scrolling smoother. */
function handleUserScroll() {
  isUserScrolling = true;
  if (scrollResumeTimer) clearTimeout(scrollResumeTimer);
  scrollResumeTimer = setTimeout(function () {
    isUserScrolling = false;
  }, 4000);
}

lyricsPanel.addEventListener("wheel", handleUserScroll, { passive: true });
lyricsPanel.addEventListener(
  "touchstart",
  function (e) {
    if (e.target.closest(".lyrics-panel")) handleUserScroll();
  },
  { passive: true },
);

/* --- 9. SYNC LYRICS ---
   This is the main syncing part. It runs during timeupdate events and also
   after manual seeks, then decides which word and line should look active.

   Basic flow:
   1. Scan backward through allWords to find the latest word at or before currentTime
   2. Stop early if that word is already active
   3. Clear old classes, update line states, and mark past words as sung
   4. Highlight the new active word

   Line states:
   - .active = current line being sung
   - .past = already finished
   - default = upcoming and still dimmed

   Word states:
   - .active = current word
   - .sung = already passed word */
function syncLyrics(currentTime) {
  var newIdx = -1;
  for (var i = allWords.length - 1; i >= 0; i--) {
    if (currentTime >= allWords[i].time) {
      newIdx = i;
      break;
    }
  }

  if (newIdx === activeWordIdx) return;

  if (activeWordIdx >= 0 && activeWordIdx < wordElements.length) {
    wordElements[activeWordIdx].classList.remove("active");
  }

  wordElements.forEach(function (el) {
    el.classList.remove("sung");
  });

  var newLineIdx = newIdx >= 0 ? allWords[newIdx].lineIdx : -1;
  if (newLineIdx !== activeLineIdx) {
    var lines = lyricsPanel.querySelectorAll(".lyric-line");
    lines.forEach(function (lineEl, idx) {
      lineEl.classList.remove("active", "past");
      if (idx === newLineIdx) lineEl.classList.add("active");
      else if (idx < newLineIdx) lineEl.classList.add("past");
    });
    if (newLineIdx >= 0 && lines[newLineIdx]) scrollToLine(lines[newLineIdx]);
    activeLineIdx = newLineIdx;
  }

  for (var k = 0; k < newIdx; k++) wordElements[k].classList.add("sung");

  if (newIdx >= 0 && newIdx < wordElements.length) {
    wordElements[newIdx].classList.add("active");
  }

  activeWordIdx = newIdx;
}

/* --- 10. PLAYBACK CONTROLS ---
   These handlers cover play/pause plus the 5-second rewind/forward buttons.
   Rewind and forward are clamped so the current time stays inside the track.

   The icon swap listens to the backend's play/pause callbacks so it works
   for both HTML5 audio events and Cordova Media status changes. */
playBtn.addEventListener("click", function () {
  if (audioBackend.isPlaying) audioBackend.pause();
  else audioBackend.play();
});

rewindBtn.addEventListener("click", function () {
  audioBackend.seek(Math.max(0, audioBackend.getCurrentTime() - 5));
});

forwardBtn.addEventListener("click", function () {
  var duration = audioBackend.getDuration();
  var limit = duration > 0 ? duration : audioBackend.getCurrentTime() + 5;
  audioBackend.seek(Math.min(limit, audioBackend.getCurrentTime() + 5));
});

// Backend callbacks update the play/pause icons and the native media
// notification (when running inside the APK).
audioBackend.onplay = function () {
  iconPlay.style.display = "none";
  iconPause.style.display = "block";
  ensureMusicControls();
  updateMusicControlsPlaying(true);
  startNotificationProgressPoll();
};

audioBackend.onpause = function () {
  iconPlay.style.display = "block";
  iconPause.style.display = "none";
  updateMusicControlsPlaying(false);
  updateMusicControlsElapsed();
  stopNotificationProgressPoll();
};

/* --- 11. TIMEUPDATE, METADATA & PROGRESS ---
   timeupdate runs a few times per second while the audio plays.
   Each run updates the progress width, syncs the lyrics, and refreshes
   the current time label.

   loadedmetadata runs once the backend already knows the track duration,
   so that is where the total time label gets filled in.

   Clicking the progress bar converts the click position into a ratio,
   then seeks the audio to that matching part of the song. */
audioBackend.ontimeupdate = function () {
  var current = audioBackend.getCurrentTime();
  var duration = audioBackend.getDuration();
  progressFill.style.width =
    ((current / (duration || 1)) * 100).toFixed(2) + "%";
  syncLyrics(current);
  timeCurrent.textContent = formatTime(current);
  // Keep the total-time label in sync once the backend finally learns
  // the duration (Cordova Media sometimes returns -1 at init).
  if (duration > 0) timeTotal.textContent = formatTime(duration);
};

audioBackend.onloadedmetadata = function () {
  var duration = audioBackend.getDuration();
  if (duration > 0) timeTotal.textContent = formatTime(duration);
};

progressContainer.addEventListener("click", function (e) {
  var rect = progressContainer.getBoundingClientRect();
  var ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
  var duration = audioBackend.getDuration();
  if (duration > 0) {
    audioBackend.seek(ratio * duration);
    progressFill.style.width = (ratio * 100).toFixed(2) + "%";
  }
});

/* --- 12. SONG ENDED ---
   Once the song finishes, everything gets marked as completed.
   This keeps the finished look on screen instead of leaving the last
   word stuck in the active state. */
audioBackend.onended = function () {
  activeWordIdx = -1;
  activeLineIdx = -1;
  wordElements.forEach(function (el) {
    el.classList.remove("active");
    el.classList.add("sung");
  });
  lyricsPanel.querySelectorAll(".lyric-line").forEach(function (el) {
    el.classList.remove("active");
    el.classList.add("past");
  });
  updateMusicControlsPlaying(false);
  updateMusicControlsElapsed();
  stopNotificationProgressPoll();
};

/* --- 13. FORMAT TIME ---
   Converts raw seconds like 83.5 into a friendlier M:SS format like 1:23.
   It returns 0:00 for NaN, which can happen before the audio metadata is ready. */
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  var m = Math.floor(seconds / 60);
  var s = Math.floor(seconds % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

/* --- 13b. FALLBACK DURATION ---
    If cordova-plugin-media never reports a real duration, derive a sane
    fallback from the last LRC timestamp so the seek bar still has a total. */
function getFallbackDuration() {
  var maxTime = 0;
  var lines = LRC_DATA.trim().split("\n");
  var wordRegex = /<(\d+):(\d+\.\d+)>([^<\[]*)/g;
  lines.forEach(function (line) {
    var m;
    while ((m = wordRegex.exec(line)) !== null) {
      var t = parseInt(m[1]) * 60 + parseFloat(m[2]);
      if (t > maxTime) maxTime = t;
    }
  });
  return maxTime + 3; // small tail buffer after the last lyric timestamp
}

function initAudioWhenReady() {
  if (typeof cordova !== "undefined") {
    document.addEventListener(
      "deviceready",
      function () {
        audioBackend.init();
      },
      false
    );
  } else {
    audioBackend.init();
  }
}

/* --- 14. INIT ---
    Parse the lyric data, render it, initialize the right audio backend,
    and scroll the first line into the upper third so the short top spacer
    does not read as dead space before playback starts. */
renderLyrics(parseLRC(LRC_DATA));
initAudioWhenReady();

// Scroll the first lyric line up near the top so the startup view is not
// dominated by the top spacer. Uses a small timeout so layout has settled.
setTimeout(function () {
  var firstLine = lyricsPanel.querySelector(".lyric-line");
  if (firstLine) {
    lyricsPanel.scrollTo({
      top: firstLine.offsetTop - 24,
      behavior: "auto",
    });
  }
}, 50);

/* --- 15. MEDIA NOTIFICATION (Cordova only) ---
   When running inside the APK, register with Android's media session so
   the notification shade + lock screen show the now-playing track, a
   play/pause control, and a seekable progress bar. This is a no-op in a
   plain browser (cordova / MusicControls are undefined), so the same file
   still works in the XAMPP preview.

   We use cordova-codeplay-music-controls (Android 12+ compatible) instead
   of music-controls2, which does not create a proper MediaSession on
   Android 13/14/15 and therefore produces no notification.

   On Android 13+ (API 33+) the POST_NOTIFICATIONS permission must be
   granted at runtime or the notification is silently suppressed. We request
   it via cordova-plugin-android-permissions before creating the notification. */
var mediaControlsReady = false;
var notificationPollTimer = null;
var musicControlsCreateAttempts = 0;

function setupMediaControls() {
  if (typeof MusicControls === "undefined") return;

  // Request POST_NOTIFICATIONS up front. The actual notification is created
  // lazily on first play so we can pass a real duration (Cordova Media's
  // getDuration() often returns -1 until playback has started preparing).
  function requestPermissionThen(cb) {
    if (
      typeof cordova !== "undefined" &&
      cordova.plugins &&
      cordova.plugins.permissions
    ) {
      var perms = cordova.plugins.permissions;
      perms.requestPermission(
        perms.POST_NOTIFICATIONS,
        cb, // granted (or already granted)
        cb  // denied -> still try; some OEMs allow it anyway
      );
    } else {
      cb();
    }
  }

  requestPermissionThen(function () {
    // Permission handled; notification will be created on first play.
  });
}

function createMusicNotification(duration) {
  if (mediaControlsReady) return;
  MusicControls.create(
    {
      track: "Imno ng PUP",
      artist: "PUP Hymn - 1986",
      album: "PUP Hymn",
      cover: "assets/PUP-Pylon.jpg",
      isPlaying: audioBackend.isPlaying,
      dismissable: true,
      hasPrev: false,
      hasNext: false,
      hasClose: true,
      duration: duration || 0,
      elapsed: Math.round(audioBackend.getCurrentTime() * 1000),
      ticker: "Now playing Imno ng PUP",
    },
    function () {
      mediaControlsReady = true;
      MusicControls.subscribe(handleMusicControlEvent);
      MusicControls.listen();
    },
    function (err) {
      console.error("MusicControls.create error:", err);
    }
  );
}

function ensureMusicControls() {
  if (mediaControlsReady || typeof MusicControls === "undefined") return;
  var duration = audioBackend.getDuration();
  if (duration > 0) {
    createMusicNotification(duration);
  } else if (musicControlsCreateAttempts < 20) {
    musicControlsCreateAttempts++;
    setTimeout(ensureMusicControls, 250);
  } else {
    // Fallback: create without a real duration so play/pause still work.
    createMusicNotification(0);
  }
}

function handleMusicControlEvent(action) {
  // cordova-codeplay-music-controls passes action as an object.
  var message = action && action.message ? action.message : "";
  var position = action && action.position ? action.position : 0;

  switch (message) {
    case "music-controls-play":
      audioBackend.play();
      break;
    case "music-controls-pause":
      audioBackend.pause();
      break;
    case "music-controls-toggle-play-pause":
      if (audioBackend.isPlaying) audioBackend.pause();
      else audioBackend.play();
      break;
    case "music-controls-seek-to":
      // position is in milliseconds.
      audioBackend.seek(position / 1000);
      break;
    case "music-controls-destroy":
    case "music-controls-stop":
      audioBackend.pause();
      audioBackend.seek(0);
      break;
  }
}

function updateMusicControlsPlaying(isPlaying) {
  if (!mediaControlsReady || typeof MusicControls === "undefined") return;
  MusicControls.updateIsPlaying(isPlaying);
}

function updateMusicControlsElapsed() {
  if (!mediaControlsReady || typeof MusicControls === "undefined") return;
  MusicControls.updateElapsed({
    elapsed: Math.round(audioBackend.getCurrentTime() * 1000),
    isPlaying: audioBackend.isPlaying,
  });
}

// deviceready fires once Cordova's native bridge is up. In a browser it
// never fires, so the no-op guard inside setupMediaControls handles that.
document.addEventListener("deviceready", setupMediaControls, false);

function startNotificationProgressPoll() {
  if (notificationPollTimer) return;
  notificationPollTimer = setInterval(updateMusicControlsElapsed, 1000);
}

function stopNotificationProgressPoll() {
  if (notificationPollTimer) {
    clearInterval(notificationPollTimer);
    notificationPollTimer = null;
  }
}
