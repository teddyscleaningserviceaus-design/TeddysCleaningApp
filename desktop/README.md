# Teddy's Cleaning Desktop Platform

A comprehensive desktop application for cleaning business management with integrated educational coding framework and future expansion capabilities for robotics and space venturing.

## Architecture

- **Frontend**: React + Vite for modern UI development
- **Backend**: Node.js/Express with modular API design
- **Desktop**: Electron for cross-platform desktop deployment
- **Database**: SQLite for local data persistence
- **Educational**: Integrated Python coding environment

## Features

### Core Business Management
- **Employee Management**: Complete CRUD operations, scheduling, performance tracking
- **Inventory Management**: Equipment and chemical cataloging with stock alerts
- **Site Management**: Client sites with floor plans and resource allocation
- **Dashboard**: Real-time business overview and quick actions

### Educational Coding Framework
- **Interactive Code Editor**: Embedded Python environment for customization
- **Guided Tutorials**: Step-by-step learning modules for business logic modification
- **Plugin System**: Extensible architecture for custom functionality
- **Sandbox Environment**: Safe code execution and testing

### Future Expansion Modules
- **Robotics Integration**: Robot fleet management and control (planned)
- **Space Venture Platform**: Spacecraft design and mission planning (planned)

## Quick Start

1. **Install Dependencies**
   ```bash
   cd desktop
   npm install
   ```

2. **Development Mode**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## Project Structure

```
desktop/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React frontend
│   └── backend/        # Express API modules
├── package.json
└── vite.config.js
```

## Modular Architecture

The application follows a strict modular design:

- **Employee Management Module**: `/api/employees`
- **Inventory Management Module**: `/api/equipment`, `/api/chemicals`
- **Site Management Module**: `/api/sites`
- **Educational Framework**: Integrated code editor and tutorials

## Technology Stack

- **Electron 28**: Cross-platform desktop framework
- **React 18**: Modern UI library with hooks
- **Vite**: Fast build tool and dev server
- **Express**: Backend API framework
- **SQLite3**: Embedded database
- **Node.js**: Runtime environment

## Development Guidelines

1. **Modular Design**: Each feature is a separate module
2. **API-First**: All business logic exposed through REST APIs
3. **Educational Focus**: Code should be readable and well-documented
4. **Extensibility**: Plugin-based architecture for future expansion
5. **Self-Contained**: Offline-first with local database

This platform serves as the foundation for evolving from cleaning business management to advanced robotics and space venture capabilities.