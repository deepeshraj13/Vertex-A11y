# Vertex A11y

A Chrome extension that scans web pages for accessibility issues and provides actionable insights to help developers build more inclusive websites.

## The Problem

Web accessibility remains a critical challenge in modern web development. Studies show that **over 96% of websites fail to meet basic accessibility standards**, creating barriers for the millions of users who rely on assistive technologies. This widespread non-compliance excludes people with disabilities from accessing essential digital services, information, and opportunities.

Common accessibility issues include:
- Missing alt text on images
- Poor color contrast ratios
- Lack of keyboard navigation support
- Missing form labels
- Improper semantic HTML structure
- Inadequate focus management

## The Solution

Vertex A11y provides developers with an intuitive, real-time accessibility scanning tool that identifies issues and offers concrete solutions. By integrating accessibility testing directly into the development workflow, we make it easier for teams to catch and fix problems before they reach production.

## Key Features

### 🔍 Comprehensive Scanning
- **Image Accessibility**: Detects missing alt text and provides specific recommendations
- **Color Contrast Analysis**: Analyzes text-background contrast ratios against WCAG guidelines
- **Keyboard Navigation**: Identifies interactive elements that aren't keyboard accessible
- **Semantic HTML**: Checks for proper landmark usage and heading hierarchy
- **Form Accessibility**: Validates form controls have associated labels
- **Media Captions**: Ensures videos include caption tracks
- **Zoom Compatibility**: Detects viewport restrictions that prevent user scaling

### 📊 Smart Scoring System
- **Compliance Estimation**: Provides percentage-based accessibility scores
- **Tiered Assessment**: Categorizes sites as AAA, AA, A, or "Needs Work"
- **Progress Tracking**: Shows passed vs. total checks with visual progress indicators

### 🎯 Advanced Filtering
- **Scope Filtering**: Toggle between "All Issues" and "Fixable Issues"
- **Type Filtering**: Filter by issue category (Images, Contrast, Keyboard, etc.)
- **Severity Filtering**: Prioritize by High, Medium, or Low severity issues

### 🤖 AI-Powered Explanations
- **Contextual Guidance**: Get detailed explanations of accessibility issues
- **Fix Recommendations**: Receive step-by-step solutions with code examples
- **Educational Support**: Learn accessibility best practices while you work

### 🎨 Interactive Tools
- **Element Highlighting**: Click "Reveal on page" to visually locate problematic elements
- **PDF Export**: Generate comprehensive accessibility reports
- **Real-time Updates**: See issue counts update dynamically as you scan

## Technologies Used

### Frontend
- **Vanilla JavaScript**: Core extension logic and DOM manipulation
- **Motion API**: Smooth animations and micro-interactions for enhanced UX
- **CSS3**: Modern styling with CSS custom properties, gradients, and backdrop filters
- **Chrome Extensions API**: Seamless browser integration

### Accessibility Engine
- **Custom Scanner**: Purpose-built accessibility analyzer
- **WCAG Compliance**: Implements Web Content Accessibility Guidelines 2.1
- **Color Science**: Precise contrast ratio calculations using relative luminance
- **DOM Analysis**: Comprehensive element inspection and path tracking

### AI Integration
- **OpenAI GPT-4**: Intelligent issue explanations and fix recommendations
- **Contextual Analysis**: AI understands specific accessibility contexts
- **Educational Content**: Generated guidance tailored to each issue type

### Architecture
- **Content Scripts**: Secure page analysis without external dependencies
- **Background Workers**: Handles AI API communication
- **Popup Interface**: Responsive, accessible UI with ARIA compliance
- **Message Passing**: Efficient communication between extension components

## Impact

### For Developers
- **Faster Development**: Catch accessibility issues during development, not after deployment
- **Learning Tool**: Understand accessibility principles through contextual guidance
- **Compliance Confidence**: Meet WCAG standards with evidence-based scoring
- **Workflow Integration**: Seamless testing without leaving the browser

### For Businesses
- **Legal Compliance**: Reduce risk of ADA and Section 508 violations
- **Market Expansion**: Reach the 1.3 billion people worldwide with disabilities
- **SEO Benefits**: Accessible sites often rank better in search results
- **Brand Reputation**: Demonstrate commitment to inclusive design
- **Cost Savings**: Fix issues early rather than expensive post-launch remediation

### For Users with Disabilities
- **Better Web Experience**: More sites become navigable with assistive technologies
- **Equal Access**: Reduced barriers to digital services and information
- **Independence**: Ability to use websites without requiring assistance

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The Vertex A11y icon will appear in your extensions toolbar

## Usage

1. Navigate to any webpage you want to analyze
2. Click the Vertex A11y extension icon
3. Click "Scan this Page" to run the accessibility analysis
4. Review the compliance score and issue breakdown
5. Use filters to focus on specific types of problems
6. Click "Reveal on page" to locate problematic elements
7. Use "Explain" for detailed guidance on fixing issues
8. Export results to PDF for documentation or reporting

```
