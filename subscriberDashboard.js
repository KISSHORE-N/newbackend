import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

// Base URL for the Spring Boot backend
const API_BASE_URL = "http://localhost:8080/api/subscriptions"; 

// --- Icon Components (Icons used locally for search, actions, and notification sidebar) ---
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-search"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-send"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 17 2 13 22 2"></polygon></svg>
);
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const NotificationIcon = () => (
    // Used in the header of the notification panel here
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-bell"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
);


// --- Initial Lists (Exported for use in Layout.js) ---
export const initialNotifications = [
    { report: 'Ops_Reports', message: 'New operations report uploaded on 2025-10-09' },
    { report: 'Finance_Reports', message: 'Monthly finance report summary available' },
    { report: 'Compliance_Data', message: 'Compliance audit access restored' },
];


function SubscriberDashboard() {
    // FIX: Get CloseIcon (defined in Layout) from context along with state/setters and user
    const { showNotifications, toggleNotifications, user, CloseIcon } = useOutletContext();
    
    // State to hold the fetched data
    const [allGroups, setAllGroups] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTable, setActiveTable] = useState('subscribed');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    
    // Notifications array for searching (retains mock data for notifications since they aren't API driven yet)
    const [notifications] = useState(initialNotifications);

    // --- Data Fetching Effect (API Logic) ---
    const fetchGroups = async () => {
        if (!user || !user.username) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/groups/${user.username}`);
            if (response.ok) {
                const data = await response.json();
                setAllGroups(data); // The backend returns groups with a status field
            } else {
                setMessage('Error fetching groups.');
                setAllGroups([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setMessage('Network error: Could not connect to the server.');
            setAllGroups([]);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchGroups();
    }, [user]); 

    // --- Interaction Handlers (API Logic) ---

    const handleNavigateClick = (groupName) => {
        console.log(`Navigating to Reports page for group: ${groupName}`);
        // Retaining your old navigation format
        navigate(`/subscriber/reports/${groupName}`);
    };

    const handleNotificationClick = (groupName) => {
        console.log(`Notification for group ${groupName} clicked.`);
        navigate('/subscriber/reports'); 
    };

    const handleSubscriptionRequest = async (group) => {
        setMessage(''); // Clear previous messages
        
        try {
            const response = await fetch(`${API_BASE_URL}/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: user.username, 
                    groupName: group.addgroup 
                }),
            });

            if (response.ok) {
                setMessage(`Subscription request sent for: ${group.addgroup}. Awaiting Admin approval.`);
                // Re-fetch groups to update the state from Unsubscribed to Pending
                fetchGroups();
            } else {
                const errorText = await response.text();
                setMessage(`Request failed: ${errorText}`);
            }
        } catch (error) {
            console.error("Error sending request:", error);
            setMessage('Network error: Failed to send subscription request.');
        }
    };
    
    // --- Group Filtering ---
    const filterGroups = (groups) => {
        if (!searchTerm) return groups;
        const term = searchTerm.toLowerCase();
        return groups.filter(group => 
            group.addgroup.toLowerCase().includes(term) || 
            group.description.toLowerCase().includes(term)
        );
    };

    // Use Memo to efficiently split groups based on fetched status
    const subscribedGroups = useMemo(() => allGroups.filter(g => g.status === 'Subscribed'), [allGroups]);
    const unsubscribedGroups = useMemo(() => allGroups.filter(g => g.status === 'Unsubscribed'), [allGroups]);
    const pendingGroups = useMemo(() => allGroups.filter(g => g.status === 'Pending'), [allGroups]);

    // Apply search filter to the separated lists
    const filteredSubscribedGroups = useMemo(() => filterGroups(subscribedGroups), [subscribedGroups, searchTerm]);
    const filteredUnsubscribedGroups = useMemo(() => filterGroups(unsubscribedGroups), [unsubscribedGroups, searchTerm]);
    const filteredPendingGroups = useMemo(() => filterGroups(pendingGroups), [pendingGroups, searchTerm]);

    // Notification filtering (retaining old client-side logic)
    const filteredNotifications = useMemo(() => {
        if (!searchTerm) return notifications;
        const term = searchTerm.toLowerCase();
        return notifications.filter(note => 
            note.report.toLowerCase().includes(term) ||
            note.message.toLowerCase().includes(term)
        );
    }, [notifications, searchTerm]);
    
    // --- UI Components: Tables ---

    const SubscribedContentTable = () => (
        <div className="reports-area primary-table-card">
            <h2 className="report-title">Subscribed Groups ({filteredSubscribedGroups.length} items)</h2>
            <div className="table-responsive">
                <table className="data-table subscriber-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>Group Name</th>
                            <th style={{ width: '40%' }}>Description</th>
                            <th style={{ width: '15%' }}>Date</th>
                            <th style={{ width: '15%' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr><td colSpan="4" className="no-reports">Loading subscribed groups...</td></tr>
                        ) : filteredSubscribedGroups.length > 0 ? (
                            filteredSubscribedGroups.map(group => (
                                <tr key={group.id} onClick={() => handleNavigateClick(group.addgroup)}>
                                    <td>
                                        <a href="#" onClick={(e) => { e.preventDefault(); handleNavigateClick(group.addgroup); }} className="action-link">{group.addgroup}</a>
                                    </td>
                                    <td>
                                        <p className="report-description">{group.description}</p>
                                    </td>
                                    <td>{new Date().toLocaleDateString()}</td> 
                                    <td>
                                        <span className={`status-tag status-${group.status.toLowerCase()}`}>
                                            {group.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="no-reports">No subscribed groups found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const UnsubscribedContentTable = () => (
        <div className="reports-area primary-table-card">
            <h2 className="report-title">New Groups Available ({filteredUnsubscribedGroups.length} items)</h2>
            <div className="table-responsive">
                <table className="data-table subscriber-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>Group</th>
                            <th style={{ width: '45%' }}>Description</th>
                            <th style={{ width: '25%' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" className="no-reports">Loading available groups...</td></tr>
                        ) : filteredUnsubscribedGroups.length > 0 ? (
                            filteredUnsubscribedGroups.map(group => (
                                <tr key={group.id}>
                                    <td>{group.addgroup}</td>
                                    <td>
                                        <p className="report-description">{group.description}</p>
                                    </td>
                                    <td>
                                        <button 
                                            className="action-button subscribe-button"
                                            onClick={() => handleSubscriptionRequest(group)}
                                        >
                                            <SendIcon /> Send Request
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="no-reports">No new groups available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const PendingRequestsTable = () => (
        <div className="reports-area primary-table-card">
            <h2 className="report-title">Pending Subscription Requests ({filteredPendingGroups.length} items)</h2>
            <div className="table-responsive">
                <table className="data-table subscriber-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>Group Name</th>
                            <th style={{ width: '40%' }}>Description</th>
                            <th style={{ width: '30%' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" className="no-reports">Loading pending requests...</td></tr>
                        ) : filteredPendingGroups.length > 0 ? (
                            filteredPendingGroups.map(group => (
                                <tr key={group.id}>
                                    <td>{group.addgroup}</td>
                                    <td>
                                        <p className="report-description">{group.description}</p>
                                    </td>
                                    <td>
                                        <span className={`status-tag status-${group.status.toLowerCase()}`}>{group.status}</span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td col colspan="3" className="no-reports">No pending subscription requests.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );


    // --- Main Content Renderer (Renders the active tab) ---
    const MainContentTable = () => {
        if (activeTable === 'subscribed') {
            return <SubscribedContentTable />;
        }
        if (activeTable === 'unsubscribed') {
            return <UnsubscribedContentTable />;
        }
        if (activeTable === 'pending') {
            return <PendingRequestsTable />;
        }
        return null;
    };


    return (
        <div className="dashboard-content">
            
            {/* --- Search Bar --- */}
            <div className="search-bar-container">
                <div className="search-input-group">
                    <SearchIcon />
                    <input
                        type="text"
                        placeholder="Search all Reports by Name or Description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="sc-search-input"
                    />
                </div>
            </div>
            
            {/* Feedback Message */}
            {message && (
                // Use a dynamic alert style based on content
                <div className={`alert ${message.includes('sent') || message.includes('approved') ? 'alert-success' : 'alert-info'} p-2 text-center my-3`} role="alert">
                    {message}
                </div>
            )}
            
            {/* --- Tab Switcher (Controls Main Table) --- */}
            <div className="tab-switcher tab-bar-container mb-4">
                <button
                    className={`tab-button ${activeTable === 'subscribed' ? 'active' : ''}`}
                    onClick={() => setActiveTable('subscribed')}
                >
                    Subscribed Groups ({filteredSubscribedGroups.length})
                </button>
                <button
                    className={`tab-button ${activeTable === 'unsubscribed' ? 'active' : ''}`}
                    onClick={() => setActiveTable('unsubscribed')}
                >
                    New Groups Available ({filteredUnsubscribedGroups.length})
                </button>
                <button
                    className={`tab-button ${activeTable === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTable('pending')}
                >
                    Pending Requests ({filteredPendingGroups.length})
                </button>
            </div>

            {/* --- Content Grid: Dynamic Layout (Uses grid-based layout from your old code) --- */}
            <div 
                className="main-content-grid permanent-split" 
                style={{ 
                    gridTemplateColumns: showNotifications ? '60% 1fr' : '1fr', 
                    gap: showNotifications ? '30px' : '0' 
                }}
            >
                
                {/* --- LEFT/MAIN COLUMN: Active Tab Table --- */}
                <MainContentTable />

                {/* --- RIGHT COLUMN: Notifications (Conditionally rendered) --- */}
                {showNotifications && (
                    <div className="notification-panel">
                        <div className="notification-header">
                            {/* Uses locally defined NotificationIcon */}
                            <NotificationIcon />
                            <h3 className="notification-title">Notifications ({filteredNotifications.length})</h3>
                        </div>
                        <div className="notification-content-nk">
                            {filteredNotifications.length > 0 ? (
                                <ul>
                                    {filteredNotifications.map((note, index) => (
                                        <li key={index} className="notification-item" onClick={() => handleNotificationClick(note.report)}>
                                            <strong className="notification-report-name">{note.report}:</strong> <span className="notification-message">{note.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="no-reports">No recent notifications.</p>
                            )}
                        </div>
                    </div>
                )}

            </div> {/* End main-content-grid */}
        </div>
    );
}

export default SubscriberDashboard;
