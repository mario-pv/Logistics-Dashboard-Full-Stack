-- Users and Fleet states
CREATE TABLE app_user (
                          id BIGSERIAL PRIMARY KEY,
                          username VARCHAR(255) UNIQUE NOT NULL,
                          role VARCHAR(50) NOT NULL,
                          fleet_status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE'
);

-- Routes
CREATE TABLE route (
                       id BIGSERIAL PRIMARY KEY,
                       driver_id BIGINT REFERENCES app_user(id),
                       route_status VARCHAR(50) NOT NULL,
                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Stops
CREATE TABLE stop (
                      id BIGSERIAL PRIMARY KEY,
                      route_id BIGINT REFERENCES route(id),
                      address VARCHAR(255) NOT NULL,
                      location GEOMETRY(Point, 4326) NOT NULL,
                      delivery_status VARCHAR(50) NOT NULL,
                      sequence_order INT NOT NULL
);