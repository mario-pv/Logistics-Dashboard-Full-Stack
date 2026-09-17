package com.example.backend.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class GpsSimulatorService {

    private final SimpMessagingTemplate messagingTemplate;

    // Starting in downtown Detroit
    private double currentLat = 42.3314;
    private double currentLng = -83.0458;

    public GpsSimulatorService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // Timer every 2,000 milliseconds (2 seconds)
    @Scheduled(fixedRate = 2000)
    public void simulateDriverMovement() {
        // Nudge the coordinates slightly to simulate driving
        currentLat += 0.0002;
        currentLng += 0.0002;

        // Build a JSON string that matches React TypeScript interface
        String payload = String.format("{\"driverId\":\"driver-1\", \"lat\":%f, \"lng\":%f}", currentLat, currentLng);

        // Broadcast it to the channel React is listening to
        messagingTemplate.convertAndSend("/topic/driver-locations", payload);

        // Print to console
        System.out.println("Dispatching live coordinate: " + payload);
    }
}
