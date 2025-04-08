# WhatsApp Contact Scanner

## Overview

A comprehensive system for scanning and managing WhatsApp contacts through three main components:

- **Chrome Extension**
- **Web Interface**
- **Backend API**

## System Architecture

### 1. Backend API

**Technology:** Fastify, Prisma, PostgreSQL, Redis, BullMQ  
**Main Functions:**

- Contact synchronization
- Data storage
- Queue processing

**Key Endpoints:**  
(You can list your API endpoints here)

### 2. Chrome Extension

**Technology:** React, TypeScript, Tailwind CSS  
**Features:**

- Contact scanning
- Message history extraction
- Phone number input with country codes

### 3. Web Interface

**Technology:** React, TypeScript, Tailwind CSS  
**Features:**

- Contact list viewing
- Phone number validation
- Interaction history display

## Database Structure

### Tables

- **User:** User profiles and authentication
- **Contact:** WhatsApp contact information
- **Message:** Communication history
- **Metadata:** Contact interaction data
- **SyncLog:** Synchronization tracking

## Setup Instructions

### 1. Backend & web interface

Start the backend and the web interface

```cmd
docker-compose up -d
```

- Backend can be accessed at `http://localhost:3000`
- Web interface can be accessed at `http://localhost:5173`
- Database can be accessed at `postgres://postgres:postgres@db:5432/whatsapp-sync`

### 2. Chrome extension

To start the extension, run:

```cmd
npm run build
```

- After the build is completed, load the `frontend/dist` folder as the extension to chrome.
- Login to Whatsapp web and use the extension.

## System Flow

1. User inputs phone number in Chrome extension
2. Extension scans WhatsApp Web contacts
3. Data syncs to backend via API
4. API queues up each unique phone number's request
5. Bulk insertions are performed in one database transaction
6. User views contacts through the web interface
