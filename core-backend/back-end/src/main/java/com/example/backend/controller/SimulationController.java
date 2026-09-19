package com.example.backend.controller;

import com.example.backend.service.GpsSimulatorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simulate")
public class SimulationController {

    private final GpsSimulatorService simulatorService;

    public SimulationController(GpsSimulatorService simulatorService) {
        this.simulatorService = simulatorService;
    }

    // Defines the JSON structure React is sending
    public static class SimRequest {
        public String driverId;
        public String routeId;
        public double[][] coordinates;
    }

    @PostMapping("/start")
    public ResponseEntity<String> startSimulation(@RequestBody SimRequest request) {
        // Pass all 3 variables into the service
        simulatorService.startSimulation(request.driverId, request.routeId, request.coordinates);
        return ResponseEntity.ok("Simulation started for route: " + request.routeId);
    }
}