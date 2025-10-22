package com.scb.rwtoolbackend.service;

import com.scb.rwtoolbackend.dto.SubscriptionDTO;
import com.scb.rwtoolbackend.model.ReportGroup;
import com.scb.rwtoolbackend.model.Subscription;
import com.scb.rwtoolbackend.model.SubscriptionRequest;
import com.scb.rwtoolbackend.repository.ReportGroupRepository;
import com.scb.rwtoolbackend.repository.SubscriptionRepository;
import com.scb.rwtoolbackend.repository.SubscriptionRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SubscriptionService {

    @Autowired
    private ReportGroupRepository groupRepository;
    
    @Autowired
    private SubscriptionRequestRepository requestRepository;
    
    @Autowired
    private SubscriptionRepository subscriptionRepository;

    /**
     * ADMIN: Retrieves all pending subscription requests.
     */
    public List<SubscriptionRequest> getPendingRequests() {
        // Retrieves all pending requests
        return requestRepository.findAll();
    }
    
    /**
     * ADMIN: Retrieves all currently approved/active subscriptions.
     * This populates the "Approved Subscriptions" table in the Admin panel.
     */
    public List<SubscriptionDTO> getApprovedSubscriptions() {
        List<Subscription> subscriptions = subscriptionRepository.findAll();
        
        // Map Subscription entities to DTOs for cleaner transfer
        return subscriptions.stream()
                .map(sub -> new SubscriptionDTO(
                    sub.getId(), // ID of the Subscription entity
                    sub.getSubscriberUsername(),
                    sub.getGroupName(),
                    sub.getSubscriptionDate().toString() // Convert LocalDate to String
                ))
                .collect(Collectors.toList());
    }

    /**
     * ADMIN: Processes a request (Approve/Reject) or revokes an active subscription.
     * The ID can be either a SubscriptionRequest ID (for pending) or a Subscription ID (for revoke).
     */
    @Transactional
    public boolean processRequest(Long id, String action) {
        if ("revoke".equalsIgnoreCase(action)) {
            // Revoke action (Removes an active subscription from the 'subscriptions' table)
            if (subscriptionRepository.existsById(id)) {
                subscriptionRepository.deleteById(id);
                return true;
            }
            return false;
        }

        // Processing PENDING Requests (Approve/Reject)
        Optional<SubscriptionRequest> optionalRequest = requestRepository.findById(id);
        if (optionalRequest.isEmpty()) {
            return false;
        }

        SubscriptionRequest request = optionalRequest.get();
        requestRepository.delete(request); // Remove the request regardless of action

        if ("approve".equalsIgnoreCase(action)) {
            // 1. Create a new active subscription entry
            Subscription subscription = new Subscription();
            subscription.setSubscriberUsername(request.getSubscriberUsername());
            subscription.setGroupName(request.getGroupName());
            subscription.setSubscriptionDate(LocalDate.now());
            
            // 2. Save the active subscription
            subscriptionRepository.save(subscription);
            return true;
        } 
        
        // If action is "reject", we simply delete the request and do nothing else.
        return true;
    }
    
    /**
     * SUBSCRIBER: Gets groups status for a specific user. (Logic remains the same)
     */
    public List<SubscriptionDTO> getGroupsForSubscriber(String subscriberUsername) {
        List<ReportGroup> allGroups = groupRepository.findAll();
        List<Subscription> activeSubscriptions = subscriptionRepository.findBySubscriberUsername(subscriberUsername);
        List<SubscriptionRequest> pendingRequests = requestRepository.findBySubscriberUsername(subscriberUsername);

        List<SubscriptionDTO> dtos = new ArrayList<>();

        for (ReportGroup group : allGroups) {
            String status = "Unsubscribed";
            
            // Check if active
            boolean isActive = activeSubscriptions.stream()
                .anyMatch(s -> s.getGroupName().equals(group.getGroupName()));
                
            // Check if pending
            boolean isPending = pendingRequests.stream()
                .anyMatch(r -> r.getGroupName().equals(group.getGroupName()));
            
            if (isActive) {
                status = "Subscribed";
            } else if (isPending) {
                status = "Pending";
            }
            
            dtos.add(new SubscriptionDTO(
                group.getId(),
                subscriberUsername,
                group.getGroupName(),
                group.getDescription(),
                status
            ));
        }
        return dtos;
    }
}
