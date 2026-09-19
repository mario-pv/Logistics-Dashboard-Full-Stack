package com.example.backend.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class GpsSimulatorService {

    private final SimpMessagingTemplate messagingTemplate;
    private boolean isSimulating = false;

    private int currentStep = 0;
    private double[][] routePath;

    private String currentDriverId;
    private String currentRouteId;

    public GpsSimulatorService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void startSimulation(String driverId, String routeId, double[][] coordinates) {
        this.currentDriverId = driverId;
        this.currentRouteId = routeId;
        this.routePath = coordinates;
        this.currentStep = 0;
        this.isSimulating = true;
        System.out.println("Simulation started for " + driverId + " on route " + routeId);
    }

    @Scheduled(fixedRate = 250)
    public void simulateDriverMovement() {
        if (!isSimulating || routePath == null) return;

        if (currentStep >= routePath.length) {
            isSimulating = false;
            String completedPayload = String.format("{\"driverId\":\"%s\", \"routeId\":\"%s\", \"status\":\"COMPLETED\"}", currentDriverId, currentRouteId);
            messagingTemplate.convertAndSend("/topic/driver-locations", completedPayload);
            return;
        }

        double currentLng = routePath[currentStep][0];
        double currentLat = routePath[currentStep][1];

        String payload = String.format("{\"driverId\":\"%s\", \"lat\":%f, \"lng\":%f}", currentDriverId, currentLat, currentLng);
        messagingTemplate.convertAndSend("/topic/driver-locations", payload);

        currentStep += 1;
    }
}