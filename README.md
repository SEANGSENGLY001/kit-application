# Mini Web App: Kit Calculator & Phone Generator

A complete front-end web application demo featuring user authentication, kit number calculations, and random Cellcard phone number generation with XML-based data storage simulation.

## ⚠️ Security Warning

**THIS IS A DEMO APPLICATION ONLY**

- Passwords are hashed using simple SHA-256 (NOT secure for production)
- All data is stored client-side in localStorage
- XML "database" is a simulation only
- Do not use real credentials or sensitive information

## Features

### 🔐 Authentication System
- User registration and login
- Password hashing (SHA-256 for demo purposes)
- Session management with localStorage
- Demo accounts available

### 🧮 Kit Number Calculator
- Formula: `10,000,000,000 - Kit Number = Result`
- Results are padded to exactly 8 digits
- Input validation (0 to 9,999,999,999)
- Error handling for results exceeding 8 digits
- Complete calculation history tracking

### 📱 Random Cellcard Phone Generator
- Uses authentic Cambodian Cellcard prefixes
- Valid prefixes: 011, 012, 014, 017, 061, 076, 077, 078, 079, 085
- Generates 9-digit numbers (3-digit prefix + 6 digits)
- Duplicate prevention (optional)
- Generation history tracking

### 📊 Dashboard & Navigation
- Welcome dashboard with statistics
- Recent activity timeline
- Responsive sidebar navigation
- User account management

### 💾 Data Management
- XML-based data structure simulation
- localStorage for persistence
- Data export functionality (XML format)
- History management and clearing

## Demo Accounts

| Username | Password |
|----------|----------|
| demo     | password |
| admin    | admin    |

## File Structure

```
├── index.html          # Main HTML file with all views
├── styles.css          # Complete CSS styling with responsive design
├── app.js              # JavaScript application logic
├── data/
│   └── users.xml       # XML "database" with initial user data
└── README.md          # This file
```

## Getting Started

1. **Clone or download** the project files
2. **Start a local server** (required for XML file loading):
   
   **Option A: Using Python**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Option B: Using Node.js**
   ```bash
   npx http-server -p 8000
   ```
   
   **Option C: Using PHP**
   ```bash
   php -S localhost:8000
   ```

3. **Open browser** and navigate to `http://localhost:8000`
4. **Login** using demo credentials or register a new account
5. **Explore** the features:
   - Try kit calculations
   - Generate phone numbers
   - View history and statistics
   - Export your data

## Usage Instructions

### Kit Calculator
1. Navigate to "Kit Calculator" in the sidebar
2. Enter a kit number (0 to 9,999,999,999)
3. Click "Calculate"
4. View the raw result and 8-digit padded result
5. Check your calculation history below

### Phone Generator
1. Navigate to "Phone Generator" in the sidebar
2. Choose whether to allow duplicate numbers
3. Click "Generate Phone Number"
4. View the generated number with its prefix
5. Check your generation history below

### Account Management
1. Navigate to "Account" in the sidebar
2. View your user statistics
3. Export your data as XML
4. Clear your history if needed
5. Reset demo data (development feature)

## Technical Implementation

### XML Data Structure
```xml
<users>
    <user username="demo" passwordHash="...">
        <history>
            <kitCalculations>
                <calculation kitNumber="12345" rawResult="9999987655" 
                           paddedResult="99999876" timestamp="2025-08-13 10:30:00"/>
            </kitCalculations>
            <phoneGenerations>
                <generation number="011123456" prefix="011" 
                          timestamp="2025-08-13 11:15:00"/>
            </phoneGenerations>
        </history>
    </user>
</users>
```

### Key Features
- **XML Parsing**: Uses DOMParser to read XML data
- **localStorage Merging**: Combines XML base data with local updates
- **Responsive Design**: Mobile-first approach with collapsible sidebar
- **Input Validation**: Comprehensive form validation and error handling
- **Data Export**: Serializes user data back to XML format
- **Toast Notifications**: User-friendly feedback system

### Browser Compatibility
- Modern browsers supporting ES6+
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Validation Rules

### Kit Number Calculator
- Must be numeric
- Range: 0 to 9,999,999,999
- Result must not exceed 8 digits
- Results padded with leading zeros

### Phone Number Generator
- Uses only valid Cellcard prefixes
- Total length: 9 digits
- Duplicate prevention available
- Format validation

### User Registration
- Username: Required, must be unique
- Password: Minimum 4 characters
- Password confirmation must match

## Responsive Features

- **Desktop**: Full sidebar navigation
- **Tablet**: Collapsible sidebar
- **Mobile**: Hamburger menu with overlay sidebar
- **Adaptive layouts**: Grid systems adjust to screen size
- **Touch-friendly**: Buttons and inputs optimized for touch

## Development Notes

### Adding New Features
1. **New Pages**: Add HTML structure in `index.html`, update navigation in `app.js`
2. **New Calculations**: Extend the calculation logic in `handleKitCalculation()`
3. **New Generators**: Add new generator functions following the phone generator pattern
4. **Styling**: Use CSS custom properties for consistent theming

### Data Persistence Flow
1. **Load**: XML → Parse → Merge with localStorage
2. **Runtime**: All operations update in-memory data
3. **Save**: In-memory data → localStorage (JSON format)
4. **Export**: In-memory data → XML serialization → Download

## Future Enhancements

- Dark mode theme toggle
- Additional phone number formats
- More calculation types
- Data import functionality
- User preferences storage
- Advanced filtering and search
- Data visualization charts

## Browser Storage

All data is stored locally in your browser using:
- **localStorage**: User data, calculation history, phone generation history
- **sessionStorage**: Current user session
- **In-memory**: Temporary calculation state

**Note**: Data will be lost if localStorage is cleared or when using incognito/private browsing mode.

## Troubleshooting

### Common Issues

**XML Loading Failed**
- Ensure you're running a local server (not opening index.html directly)
- Check browser console for CORS errors
- Verify the `data/users.xml` file exists

**Calculations Not Saving**
- Check browser localStorage permissions
- Verify you're logged in
- Check browser console for JavaScript errors

**Responsive Issues**
- Clear browser cache
- Test in different browsers
- Check CSS custom property support

### Development Tools

Access browser developer tools (F12) to:
- View localStorage data: Application → Storage → Local Storage
- Debug JavaScript: Console tab
- Inspect network requests: Network tab
- Test responsive design: Device toolbar

## License

This is a demo application for educational purposes. Feel free to use and modify for learning and demonstration purposes.

---

**Remember**: This is a client-side only application. All data processing happens in your browser and no information is sent to any server.
