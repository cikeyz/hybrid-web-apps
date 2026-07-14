# --------------------------------------------------------
# cordova-env.ps1 — shared environment for Activity-07 Cordova builds.
# Sources this to get the right JDK and Android SDK on PATH.
# System JAVA_HOME is intentionally left untouched (it points at JDK 25);
# we only override the vars for this build session.
# --------------------------------------------------------
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot'
$env:ANDROID_HOME = 'C:\Android\Sdk'
$env:ANDROID_SDK_ROOT = 'C:\Android\Sdk'
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;C:\Gradle\bin;$env:Path"

