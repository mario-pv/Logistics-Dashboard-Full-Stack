import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Data we expect from Java
export interface DriverLocation {
    driverId: string;
    lat: number;
    lng: number;
}
// Empty function for callback
class WebSocketService {
    private client: Client;
    private onLocationUpdate: (data: DriverLocation) => void = () => {};

// SockJS fallback if raw WebSockets aren't supported
    constructor() {
        this.client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/ws-fleet'),
            debug: (str) => {
                console.log(str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = () => {
            console.log('Connected to Fleet WebSocket!');
            this.client.subscribe('/topic/driver-locations', (message) => {
                if (message.body) {
                    const parsedData = JSON.parse(message.body);
                    this.onLocationUpdate(parsedData);
                }
            });
        };

        this.client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };
    }

    //  State update functions
    public setLocationCallback(callback: (data: DriverLocation) => void) {
        this.onLocationUpdate = callback;
    }

    public connect() {
        this.client.activate();
    }

    public disconnect() {
        this.client.deactivate();
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;