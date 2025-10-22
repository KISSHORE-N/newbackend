import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Assuming the correct path to your logo and common styles
import logo from '../../subscriber/main_page/assets/logo.png'; 

// Base URL for the subscription API endpoint
const API_BASE_URL = "http://localhost:8080/api/subscriptions"; 

// --- User & Icon Components ---
const LogOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-rotate-ccw"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.5 15a9 9 0 1 0 .7-7.7L1 10"></path></svg>
);
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-search"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

const getLoggedInUser = () => {
  const user = sessionStorage.getItem('loggedInUser');
  return user ? JSON.parse(user) : null;
};
const defaultAdmin = { username: "Admin User", role: "Admin" };

function AdminPage() {
    const navigate = useNavigate();
    const [pendingRequests, setPendingRequests] = useState([]);
    const [approvedRequests, setApprovedRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const loggedInUser = getLoggedInUser() || defaultAdmin;

    // --- Data Fetching Effect ---
    const fetchAdminData = async () => {
        setLoading(true);
        setMessage('');
        try {
            // 1. Fetch Pending Requests
            const pendingResponse = await fetch(`${API_BASE_URL}/admin/requests`);
            const pendingData = pendingResponse.ok ? await pendingResponse.json() : [];
            
            // 2. Fetch Approved Subscriptions
            const approvedResponse = await fetch(`${API_BASE_URL}/admin/approved-subscriptions`);
            const approvedData = approvedResponse.ok ? await approvedResponse.json() : [];

            // Map data for consistent usage in tables
            setPendingRequests(pendingData.map(req => ({
                requestId: req.requestId,
                addgroup: req.groupName,
                username: req.subscriberUsername,
                dateRequested: req.requestedDate,
                // Mocked fields from original implementation for UI structure
                folder: 'Client Data A', 
                reportName: req.groupName.replace(/_/g, ' ') + ' Report',
                status: 'Pending'
            })));
            
            setApprovedRequests(approvedData.map(sub => ({
                id: sub.id, // This is the Subscription ID (for Revoke)
                addgroup: sub.groupName,
                username: sub.subscriberUsername,
                dateRequested: sub.subscriptionDate,
                // Mocked fields for UI structure
                folder: 'Approved Folder', 
                reportName: sub.groupName.replace(/_/g, ' ') + ' Report',
                status: 'Approved'
            })));

            setMessage(`Loaded ${pendingData.length} pending requests and ${approvedData.length} active subscriptions.`);

        } catch (error) {
            console.error("Error fetching admin data:", error);
            setMessage('Network error: Could not connect to the backend server or data mapping failed.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    // --- Action Handler (Approve/Deny/Revoke) ---
    const handleAction = async (id, action) => {
        setMessage('Processing request...'); 
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/process-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // THIS IS THE CRITICAL FIX: Ensure the payload matches what the Java DTO expects
                body: JSON.stringify({ 
                    // Backend expects the ID in 'requestId' field, regardless if it's Request ID or Subscription ID
                    requestId: id, 
                    action: action 
                }),
            });

            if (response.ok) {
                const actionVerb = action.substring(0, 1).toUpperCase() + action.substring(1).toLowerCase();
                setMessage(`${actionVerb} successful. Refreshing data...`);
                // Re-fetch the data to update the UI
                fetchAdminData();
            } else {
                const errorText = await response.text();
                setMessage(`Failed to process action (${action}): ${errorText}`);
            }
        } catch (error) {
            console.error("Error processing request:", error);
            setMessage('Network error: Failed to communicate with the server.');
        }
    };
    
    // --- Logout ---
    const handleLogout = () => {
        sessionStorage.removeItem('loggedInUser');
        console.log('Admin Logged out.');
        navigate('/'); 
    };

    // --- Filtering Logic ---
    const filterData = (data, term) => {
        if (!term) return data;
        const lowerTerm = term.toLowerCase();
        return data.filter(item => (
            item.username.toLowerCase().includes(lowerTerm) ||
            item.addgroup.toLowerCase().includes(lowerTerm) ||
            item.reportName.toLowerCase().includes(lowerTerm)
        ));
    };

    const filteredPendingRequests = useMemo(() => 
        filterData(pendingRequests, searchTerm), 
        [pendingRequests, searchTerm]
    );

    const filteredApprovedRequests = useMemo(() => 
        filterData(approvedRequests, searchTerm), 
        [approvedRequests, searchTerm]
    );

    return (
        <div className="app-container">
            {/* --- NAV-BAR / HEADER --- */}
            <header className="main-header" style={{ justifyContent: 'space-between' }}>
                <div className="header-left-content">
                    <div className="logo-section" onClick={() => navigate('/admin')}>
                        <img src={logo} alt="Standard Chartered logo" className="sc-logo" />
                    </div>
                    <div className="user-profile">
                        <h1 className="user-name">{loggedInUser.username}</h1>
                        <p className="user-email">Admin Approval</p>
                    </div>
                </div>
                
                <div className="header-actions">
                    {/* Log Out Button */}
                    <button 
                        className="action-button logout-button"
                        onClick={handleLogout}
                        title="Logout Admin"
                    >
                        <LogOutIcon />
                        Logout
                    </button>
                </div>
            </header>

            {/* --- MAIN DASHBOARD AREA --- */}
            <div className="dashboard-content admin-page-container">
                <h1 className="report-title">Subscription Request Management</h1>

                {/* --- Search Bar --- */}
                <div className="search-bar-container mb-4">
                    <div className="search-input-group">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search by User, Group, or Report Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="sc-search-input"
                        />
                    </div>
                </div>

                {/* Feedback Message */}
                {message && (
                    <div className={`alert alert-${message.includes('success') || message.includes('Success') ? 'success' : 'danger'} p-2 text-center my-3`} role="alert">
                        {message}
                    </div>
                )}
                
                {loading && <div className="p-5 text-center text-primary">Loading data from backend...</div>}

                {!loading && (
                    <>
                        {/* --- PENDING REQUESTS TABLE --- */}
                        <div className="reports-area admin-table-card pending-requests-area mb-5">
                            <h2 className="table-subtitle">Pending Requests ({filteredPendingRequests.length} pending)</h2>
                            <div className="table-responsive">
                                <table className="data-table admin-request-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '15%' }}>User Name</th>
                                            <th style={{ width: '15%' }}>AD Group</th>
                                            <th style={{ width: '15%' }}>Folder</th>
                                            <th style={{ width: '18%' }}>Report Name</th>
                                            <th style={{ width: '10%' }}>Date</th>
                                            <th style={{ width: '27%' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPendingRequests.length > 0 ? (
                                            filteredPendingRequests.map((req) => (
                                                <tr key={req.requestId} className="status-row">
                                                    <td>{req.username}</td>
                                                    <td>{req.addgroup}</td>
                                                    <td><span className="destination-tag">{req.folder}</span></td>
                                                    <td><p className="report-description">{req.reportName}</p></td>
                                                    <td>{new Date(req.dateRequested).toLocaleDateString()}</td>
                                                    <td className="admin-action-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        {/* Approve Button: Passes Request ID and 'approve' action */}
                                                        <button
                                                            className="action-button admin-approve-button"
                                                            onClick={() => handleAction(req.requestId, 'approve')} 
                                                            style={{ backgroundColor: 'green', color: 'white' }}
                                                        >
                                                            <CheckIcon /> Approve
                                                        </button>
                                                        {/* Deny Button: Passes Request ID and 'reject' action */}
                                                        <button
                                                            className="action-button admin-deny-button"
                                                            onClick={() => handleAction(req.requestId, 'reject')} 
                                                            style={{ backgroundColor: 'red', color: 'white' }}
                                                        >
                                                            <XIcon /> Deny
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="no-reports">No pending requests require action.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* --- APPROVED REQUESTS TABLE (With Revoke Option) --- */}
                        <div className="reports-area admin-table-card approved-requests-area">
                            <h2 className="table-subtitle">Approved Subscriptions ({filteredApprovedRequests.length} active)</h2>
                            <div className="table-responsive">
                                <table className="data-table admin-request-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '15%' }}>User Name</th>
                                            <th style={{ width: '15%' }}>AD Group</th>
                                            <th style={{ width: '15%' }}>Folder</th>
                                            <th style={{ width: '25%' }}>Report Name</th>
                                            <th style={{ width: '10%' }}>Date</th>
                                            <th style={{ width: '20%' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredApprovedRequests.length > 0 ? (
                                            filteredApprovedRequests.map((req) => (
                                                <tr key={req.id} className="status-row">
                                                    <td>{req.username}</td>
                                                    <td>{req.addgroup}</td>
                                                    <td><span className="destination-tag">{req.folder}</span></td>
                                                    <td><p className="report-description">{req.reportName}</p></td>
                                                    <td>{new Date(req.dateRequested).toLocaleDateString()}</td>
                                                    <td>
                                                        {/* Revoke Button: Passes Subscription ID and 'revoke' action */}
                                                        <button
                                                            className="action-button admin-revoke-button"
                                                            onClick={() => handleAction(req.id, 'revoke')} 
                                                            style={{ backgroundColor: '#0087CE', color: 'white' }}
                                                        >
                                                            <UndoIcon /> Revoke
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="no-reports">No currently approved subscriptions.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default AdminPage;
