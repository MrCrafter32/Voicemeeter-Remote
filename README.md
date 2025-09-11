**VoiceMeeter UI**

A modern, minimalist, and high-performance remote control application for VoiceMeeter, built with Electron and a native C++ addon. This application provides a clean, scalable user interface to manage your VoiceMeeter instance in real-time.
User Guide

After running the setup file to install the application, you can launch it from your Start Menu or desktop shortcut. The application will automatically connect to your running VoiceMeeter instance.

    Gain Sliders: Control the volume for all input and output faders.

    Routing Matrix: Assign any input strip to any physical or virtual output bus.

    Automatic Restart: The application will automatically restart the VoiceMeeter engine when a new audio device is connected or disconnected.

Features

    Real-Time Sync: Uses a background C++ worker thread to monitor VoiceMeeter for changes, providing instant UI updates without polling or lag.

    Full Control Surface: Manage input strip and output bus gains, mute, solo, EQ, routing matrix, compressor, and gate controls.

    Modern, Scalable UI: A borderless, clean interface inspired by Shadcn UI that scales proportionally with the window size, eliminating the need for scrolling.

    Automatic Engine Restart: Intelligently detects when an audio device is connected or disconnected and automatically sends a restart command to the VoiceMeeter engine.

    High Performance: Bypasses generic libraries by using a custom C++ addon with N-API for direct, high-speed communication with the VoiceMeeter DLL.

Technology Stack

    Framework: Electron

    Backend: Node.js

    Native Core: C++ Addon using N-API

    Frontend: HTML, JavaScript, and Tailwind CSS

    Packaging: electron-builder
