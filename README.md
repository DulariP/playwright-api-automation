# Playwright API Automation Framework

[![Playwright API Tests](https://github.com/DulariP/playwright-api-automation/actions/workflows/api-tests.yml/badge.svg)](https://github.com/DulariP/playwright-api-automation/actions/workflows/api-tests.yml)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript\&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright\&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js\&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI/CD-2088FF?logo=githubactions\&logoColor=white)

A scalable API automation framework built with **TypeScript**, **Playwright**, and **GitHub Actions** following modern automation engineering best practices. The framework demonstrates reusable API design, centralized authentication, environment-based execution, reporting, and CI/CD integration.

---

# Table of Contents

* Project Overview
* Features
* Tech Stack
* Framework Architecture
* Project Structure
* Installation
* Environment Configuration
* Running Tests
* Reports
* Continuous Integration
* GitHub Secrets
* Framework Highlights
* Skills Demonstrated
* Future Improvements
* Author
* License

---

# Project Overview

This project automates REST API testing against the **Restful Booker API** using Playwright's API testing capabilities. It follows a clean, maintainable architecture with reusable API clients, fixtures, helper utilities, centralized authentication, schema validation, and dynamic test data generation.

The framework is designed to be:

* Easy to maintain
* Easy to scale
* CI/CD ready
* Suitable for real-world API automation projects

---

# Features

* REST API automation with Playwright
* TypeScript-based framework
* Reusable API Client architecture
* Centralized authentication management
* Positive & Negative API scenarios
* Complete CRUD API validation
* Dynamic test data using Faker
* JSON Schema Validation
* Request & Response logging
* Environment-based execution
* Playwright HTML Reports
* Allure Reports
* JSON Report
* JUnit XML Report
* GitHub Actions CI/CD
* GitHub Secrets integration
* Automatic artifact publishing
* Retry support in CI

---

# Tech Stack

* TypeScript
* Playwright
* Node.js
* Faker
* Dotenv
* Allure Playwright
* GitHub Actions
* Git
* REST API

---

# Framework Architecture

```text
                    Playwright Tests
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     Fixtures         Test Data        Utilities
          │                │                │
          └────────────────┼────────────────┘
                           │
                      API Layer
                           │
            ┌──────────────┼──────────────┐
            │              │              │
        Base API       Auth API      Booking API
                           │
                     Authentication
                           │
                           ▼
                  Restful Booker API

Reports
├── HTML Report
├── Allure Report
├── JSON Report
└── JUnit Report

GitHub Actions
        │
GitHub Secrets
        │
Continuous Integration
```

---

# Project Structure

```text
.
├── api/
├── config/
├── environments/
├── fixtures/
├── helpers/
├── models/
├── schemas/
├── test-data/
├── tests/
│   └── api/
├── utils/
├── playwright.config.ts
├── package.json
└── README.md
```

---

# Installation

Clone the repository:

```bash
git clone https://github.com/DulariP/playwright-api-automation.git
cd playwright-api-automation
```

Install dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install
```

---

# Environment Configuration

Create an environment file:

```text
environments/qa.env
```

Example:

```env
BASE_URL=https://restful-booker.herokuapp.com
USERNAME=admin
PASSWORD=password123
```

> **Note:** Local development uses `.env` files, while GitHub Actions uses **GitHub Repository Secrets**.

---

# Running Tests

Run all API tests:

```bash
npm run test:qa
```

Run a specific test:

```bash
npx playwright test tests/api/positive/auth.spec.ts
```

Run tests in headed mode:

```bash
npx playwright test --headed
```

Run in debug mode:

```bash
npx playwright test --debug
```

---

# Reports

After execution the framework generates:

* Playwright HTML Report
* Allure Report
* JSON Report
* JUnit XML Report

Open the Playwright report:

```bash
npx playwright show-report api-test-report
```

Open the Allure report:

```bash
allure serve allure-results
```

---

# Continuous Integration

The project includes a GitHub Actions pipeline that automatically:

* Checks out the repository
* Installs dependencies
* Injects GitHub Secrets
* Executes Playwright API tests
* Generates reports
* Uploads reports as workflow artifacts

Workflow file:

```text
.github/workflows/api-tests.yml
```

---

# GitHub Secrets

The CI pipeline uses GitHub Repository Secrets instead of committing credentials.

Required secrets:

* BASE_URL
* USERNAME
* PASSWORD

---

# Framework Highlights

* Reusable Base API class
* Centralized authentication
* Environment-specific configuration
* Dynamic test data generation
* JSON schema validation
* Request & Response logging
* Custom Playwright fixtures
* API response verification
* Retry support
* HTML & Allure reporting
* GitHub Actions CI/CD
* Secure secret management

---

# Skills Demonstrated

This project demonstrates practical experience with:

* API Automation Testing
* TypeScript
* Playwright API Testing
* REST API Testing
* Authentication Testing
* CRUD API Validation
* JSON Schema Validation
* Test Framework Design
* Git & GitHub
* GitHub Actions
* CI/CD Pipelines
* GitHub Secrets
* Test Reporting
* Environment Configuration

---

# Future Improvements

* Docker support
* Parallel environment execution
* Scheduled nightly pipeline
* Slack/MS Teams notifications
* Docker Compose
* Performance testing integration
* Code quality checks (ESLint & Prettier)
* SonarQube integration
* API coverage reporting

---

# Author

**Dulari Pemachandra**

QA Lead | API Automation Engineer

GitHub: https://github.com/DulariP

---

# License

This project is intended for learning, portfolio demonstration, and automation engineering best practices.
 