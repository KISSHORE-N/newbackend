package com.scb.rwtoolbackend.controller;

import com.scb.rwtoolbackend.dto.SubscriptionDTO;
import com.scb.rwtoolbackend.service.SubscriptionService;
import com.scb.rwtoolbackend.service.SubscriptionService.GroupStatusDTO;
import com.scb.rwtoolbackend.service.SubscriptionService.RequestDetailsDTO;
import com.scb.rwtoolbackend.service.SubscriptionService.ApprovedSubscriptionDTO; // Import the new DTO
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
@CrossOrigin(origins = "http://localhost:3000") 
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    // --- Subscriber Endpoints ---

    // Endpoint for subscriber to get their groups (Subscribed, Unsubscribed, Pending)
    @GetMapping("/groups/{username}")
    public ResponseEntity<List<GroupStatusDTO>> getGroups(@PathVariable String username) {
        try {
            List<GroupStatusDTO> groups = subscriptionService.getGroupsBySubscriber(username);
            return ResponseEntity.ok(groups);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Endpoint for subscriber to request a new subscription
    @PostMapping("/request")
    public ResponseEntity<String> requestSubscription(@RequestBody SubscriptionDTO dto) {
        if (subscriptionService.sendSubscriptionRequest(dto)) {
            return ResponseEntity.ok("Subscription request sent for: " + dto.getGroupName());
        }
        return ResponseEntity.badRequest().body("Failed to send request. Already subscribed or pending.");
    }
    
    // --- Admin Endpoints ---

    // Endpoint for Admin to view pending requests
    @GetMapping("/admin/requests")
    public ResponseEntity<List<RequestDetailsDTO>> getPendingRequests() {
        List<RequestDetailsDTO> requests = subscriptionService.getPendingRequests();
        return ResponseEntity.ok(requests);
    }
    
    /**
     * NEW: Endpoint for Admin to view approved subscriptions (needed for Revoke table)
     */
    @GetMapping("/admin/approved-subscriptions")
    public ResponseEntity<List<ApprovedSubscriptionDTO>> getApprovedSubscriptions() {
        List<ApprovedSubscriptionDTO> approved = subscriptionService.getApprovedSubscriptions();
        return ResponseEntity.ok(approved);
    }
    
    // Endpoint for Admin to approve, reject, or REVOKE a request
    @PostMapping("/admin/process-request")
    public ResponseEntity<String> processRequest(@RequestBody SubscriptionDTO dto) {
        if (dto.getRequestId() == null || dto.getAction() == null) {
            return ResponseEntity.badRequest().body("ID (Request or Subscription) and action are required.");
        }
        if (subscriptionService.processSubscriptionRequest(dto)) {
            // Customize response based on action for better feedback
            String action = dto.getAction().substring(0, 1).toUpperCase() + dto.getAction().substring(1).toLowerCase();
            return ResponseEntity.ok(action + " processed successfully.");
        }
        return ResponseEntity.badRequest().body("Failed to process action. ID not found.");
    }
}
