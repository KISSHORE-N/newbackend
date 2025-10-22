package com.scb.rwtoolbackend.service;

import com.scb.rwtoolbackend.dto.SubscriptionDTO;
import com.scb.rwtoolbackend.model.*;
import com.scb.rwtoolbackend.repository.*;
import com.scb.rwtoolbackend.model.SubscriptionRequest.RequestStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import org.springframework.transaction.annotation.Transactional; // Import needed for @Transactional

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.Arrays;
import java.time.LocalDate;

// Lombok imports (assuming you have them)
import lombok.Data;
import lombok.NoArgsConstructor;

@Service
public class SubscriptionService {

    @Autowired
    private ReportGroupRepository groupRepository;
    @Autowired
    private SubscriptionRepository subscriptionRepository;
    @Autowired
    private SubscriptionRequestRepository requestRepository;
    @Autowired
    private SubscriberRepository subscriberRepository; 
    @Autowired
    private AdminRepository adminRepository;

    // Hardcoded groups based on your SubscriberDashboard.js
    private static final List<ReportGroup> INITIAL_GROUPS = Arrays.asList(
        new ReportGroup("Ops_Reports", "Operations and performance reports", "Core"),
        new ReportGroup("Finance_Reports", "Financial insights and expense summaries", "Core"),
        new ReportGroup("Compliance_Data", "Compliance and audit data access", "Core"),
        new ReportGroup("HR_Metrics", "HR workforce planning and attrition metrics", "Core"),
        new ReportGroup("IT_Security", "IT infrastructure uptime and incident logs", "Core"),
        new ReportGroup("Treasury_Assets", "Monthly treasury management and liquidity forecasts", "Core"),
        new ReportGroup("Retail_Sales", "Retail banking customer acquisition and churn reports", "Core"),
        new ReportGroup("Wholesale_Credit", "Global commodity market analysis and hedging strategy papers", "Core")
    );

    // Initial data loading function - runs once on application start
    @PostConstruct
    public void setupInitialGroups() {
        if (groupRepository.count() == 0) {
            groupRepository.saveAll(INITIAL_GROUPS);
        }
        // Ensure a default Admin exists for testing approval
        if (adminRepository.count() == 0) {
            adminRepository.save(new Admin("admin", "1111"));
        }
    }
    
    // --- Subscriber Logic ---

    public List<GroupStatusDTO> getGroupsBySubscriber(String username) {
        Subscriber subscriber = subscriberRepository.findByUsernameIgnoreCase(username);
        if (subscriber == null) {
            throw new IllegalArgumentException("Subscriber not found.");
        }

        List<ReportGroup> allGroups = groupRepository.findAll();
        
        // 1. Get approved subscriptions
        List<Subscription> approvedSubscriptions = subscriptionRepository.findBySubscriber(subscriber);
        // Extract IDs of subscribed groups
        List<Long> subscribedIds = approvedSubscriptions.stream()
            .map(s -> s.getGroup().getId())
            .collect(Collectors.toList());

        // 2. Get pending requests
        List<SubscriptionRequest> pendingRequests = requestRepository.findBySubscriberAndStatus(subscriber, RequestStatus.PENDING);
        // Extract IDs of pending groups
        List<Long> pendingIds = pendingRequests.stream()
            .map(r -> r.getGroup().getId())
            .collect(Collectors.toList());

        // 3. Map all groups to DTO with status
        return allGroups.stream()
            .map(group -> {
                String status = "Unsubscribed";
                if (subscribedIds.contains(group.getId())) {
                    status = "Subscribed";
                } else if (pendingIds.contains(group.getId())) {
                    status = "Pending";
                }
                return new GroupStatusDTO(group.getId(), group.getName(), group.getDescription(), status);
            })
            .collect(Collectors.toList());
    }
    
    public boolean sendSubscriptionRequest(SubscriptionDTO dto) {
        Subscriber subscriber = subscriberRepository.findByUsernameIgnoreCase(dto.getUsername());
        ReportGroup group = groupRepository.findByName(dto.getGroupName());
        
        if (subscriber == null || group == null) return false;
        
        // Check if already subscribed
        if (subscriptionRepository.findBySubscriberAndGroup(subscriber, group) != null) return false;

        // Check if request is already pending
        if (requestRepository.findBySubscriberAndGroup(subscriber, group) != null) return false;
        
        SubscriptionRequest request = new SubscriptionRequest();
        request.setSubscriber(subscriber);
        request.setGroup(group);
        requestRepository.save(request);
        return true;
    }
    
    // --- Admin Logic ---

    // DTO for Admin view
    @Data
    public static class RequestDetailsDTO {
        private Long requestId;
        private String groupName;
        private String subscriberUsername;
        private String requestedDate;

        public RequestDetailsDTO(SubscriptionRequest req) {
            this.requestId = req.getId();
            this.groupName = req.getGroup().getName();
            this.subscriberUsername = req.getSubscriber().getUsername();
            this.requestedDate = req.getRequestedDate().toString();
        }
    }
    
    // NEW DTO for Admin Approved Subscriptions View
    @Data
    public static class ApprovedSubscriptionDTO {
        private Long id; // This is the Subscription ID (used for Revoke)
        private String groupName;
        private String subscriberUsername;
        private String subscriptionDate;

        public ApprovedSubscriptionDTO(Subscription sub) {
            this.id = sub.getId();
            this.groupName = sub.getGroup().getName();
            this.subscriberUsername = sub.getSubscriber().getUsername();
            // Assuming Subscription entity has a creation/subscription date field
            this.subscriptionDate = LocalDate.now().toString(); // Use current date as placeholder
        }
    }
    
    public List<RequestDetailsDTO> getPendingRequests() {
        return requestRepository.findByStatus(RequestStatus.PENDING).stream()
            .map(RequestDetailsDTO::new)
            .collect(Collectors.toList());
    }
    
    /**
     * ADMIN: Retrieves all approved subscriptions for the Approved Subscriptions table.
     */
    public List<ApprovedSubscriptionDTO> getApprovedSubscriptions() {
        return subscriptionRepository.findAll().stream()
            .map(ApprovedSubscriptionDTO::new)
            .collect(Collectors.toList());
    }
    
    /**
     * ADMIN: Revokes an active subscription by deleting the record.
     */
    @Transactional
    public boolean revokeSubscription(Long subscriptionId) {
        if (subscriptionRepository.existsById(subscriptionId)) {
            subscriptionRepository.deleteById(subscriptionId);
            return true;
        }
        return false;
    }


    @Transactional
    public boolean processSubscriptionRequest(SubscriptionDTO dto) {
        
        // --- NEW: Handle Revoke Action ---
        if (dto.getAction() != null && dto.getAction().equalsIgnoreCase("revoke")) {
            // The front-end passes the Subscription ID in the requestId field for revocation
            return revokeSubscription(dto.getRequestId()); 
        }

        // --- Handle Approve/Reject Actions ---
        Optional<SubscriptionRequest> optionalRequest = requestRepository.findById(dto.getRequestId());
        
        if (optionalRequest.isEmpty()) return false;
        
        SubscriptionRequest request = optionalRequest.get();
        
        if (dto.getAction().equalsIgnoreCase("approve")) {
            // 1. Save to the official subscriptions table
            Subscription subscription = new Subscription();
            subscription.setSubscriber(request.getSubscriber());
            subscription.setGroup(request.getGroup());
            subscription.setSubscriptionDate(LocalDate.now()); // Assuming you have this field set
            subscriptionRepository.save(subscription);
            
            // 2. Update request status
            request.setStatus(RequestStatus.APPROVED);
            requestRepository.save(request);
            return true;
            
        } else if (dto.getAction().equalsIgnoreCase("reject")) {
            // Only update request status
            request.setStatus(RequestStatus.REJECTED);
            requestRepository.save(request);
            return true;
        }
        
        return false;
    }

    // DTO for returning group status to the front-end
    @Data
    @NoArgsConstructor
    public static class GroupStatusDTO {
        private Long id;
        private String addgroup; // Mapped to front-end field name
        private String description;
        private String status;
        
        public GroupStatusDTO(Long id, String name, String description, String status) {
            this.id = id;
            this.addgroup = name;
            this.description = description;
            this.status = status;
        }
    }
}
