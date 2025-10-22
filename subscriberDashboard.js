import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import './CommonStyles.css';
import { initialNotifications } from './SubscriberDashboard';

// --- Icon Components ---
const NotificationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const LogOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

// Hardcoded user info for the header
const subscriber = {
    name: 'Lucifer',
    email: 'lucifer@gmail.com',
};

function Layout() {
    const [showNotifications, setShowNotifications] = useState(false);
    const navigate = useNavigate(); 
    const notificationCount = initialNotifications.length;

    const toggleNotifications = () => {
        setShowNotifications(prev => !prev);
    };
    
    const handleLogout = () => {
        console.log("User logged out.");
        alert("Logged out successfully.");
        navigate('/');
    };

    return (
        <div className="app-container">
            {/* --- NAVBAR / HEADER --- */}
            <header className="main-header">
                <div className="logo-section" onClick={() => navigate('/')}>
                    <img src="/path/to/standard-chartered-logo.svg" alt="Standard Chartered Logo" className="sc-logo" />
                </div>
                <div className="user-profile">
                    <h1 className="user-name">{subscriber.name}</h1>
                    <p className="user-email">{subscriber.email}</p>
                </div>
                
                {/* --- HEADER ACTIONS --- */}
                <div className="header-actions">
                    {/* Notification Toggle */}
                    <button 
                        className={`notification-toggle-button ${showNotifications ? 'active' : ''}`}
                        onClick={toggleNotifications}
                        title={showNotifications ? "Hide Notifications" : "Show Notifications"}
                    >
                        {showNotifications ? <CloseIcon /> : <NotificationIcon />}
                        {notificationCount > 0 && (
                            <span className="notification-badge">{notificationCount}</span>
                        )}
                    </button>
                    
                    {/* Log Out Button (Restored) */}
                    <button 
                        className="action-button logout-button"
                        onClick={handleLogout}
                    >
                        <LogOutIcon />
                        Logout
                    </button>
                </div>
            </header>

            {/* --- MAIN CONTENT AREA: Pass state/setter via context --- */}
            <Outlet context={{ showNotifications, toggleNotifications }} /> 
        </div>
    );
}

export default Layout;
