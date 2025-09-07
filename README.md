VoiceMeeter Remote Control

A modern, minimalist, and high-performance remote control application for Voicemeeter, built with Electron and a native C++ addon. This application provides a clean, scalable user interface to manage your VoiceMeeter instance in real-time.
Features

    Real-Time Sync: Uses a background C++ worker thread to monitor VoiceMeeter for changes, providing instant UI updates without polling or lag.

    Full Control Surface: Manage input strip and output bus gains, mute, solo, EQ, routing matrix, compressor, and gate controls.

    Modern, Scalable UI: A borderless, clean interface inspired by Shadcn UI that scales proportionally with the window size, eliminating the need for scrolling.

    Automatic Engine Restart: Intelligently detects when an audio device is connected or disconnected and automatically sends a restart command to the VoiceMeeter engine.

    High Performance: Bypasses generic libraries by using a custom C++ addon with N-API for direct, high-speed communication with the VoiceMeeter DLL.

    Cross-Platform Ready: Built with Electron, making it easy to package for Windows.

Technology Stack

    Framework: Electron

    Backend: Node.js

    Native Core: C++ Addon using N-API for native system integration.

    Frontend: HTML, JavaScript, and Tailwind CSS for styling.

    Packaging: electron-builder

Development Setup

Follow these instructions to run the application in a development environment.
Prerequisites

    Node.js: Make sure you have Node.js (v18 or later) and npm installed.

    Visual Studio Build Tools: You must have the Visual Studio Build Tools installed with the "Desktop development with C++" workload. This is required to compile the C++ addon.

Installation & Configuration

    Clone the repository:

    git clone <repository-url>
    cd <repository-folder>

    Install dependencies:

    npm install

    Configure the DLL Path:

        Open the voicemeeter.cpp file.

        On the line with the dllPath variable, update the path to the exact location of your VoicemeeterRemote64.dll file. Remember to use double backslashes (\\).

    // Example:
    const char* dllPath = "C:\\Program Files (x86)\\VB\\Voicemeeter Potato\\VoicemeeterRemote64.dll";

    Build the Native Addon:
    This step compiles the C++ code into a .node file that the application can use.

    npm run build

Running the Application

After building the addon, you can start the application in development mode:

npm start

Packaging for Distribution

To package the application into a distributable .exe installer, run the following command:

npm run dist

The completed installer will be located in the newly created dist/ folder.