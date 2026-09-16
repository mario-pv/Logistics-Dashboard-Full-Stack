from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

app = FastAPI(title="Logistics Routing Engine")

# Expected JSON payload from Spring Boot
class RouteRequest(BaseModel):
    distance_matrix: list[list[int]]
    num_vehicles: int
    depot: int

class RouteResponse(BaseModel):
    routes: dict[str, list[int]]
    total_distance: int

@app.post("/optimize", response_model=RouteResponse)
def optimize_route(request: RouteRequest):
    # 1. Routing Index Manager
    manager = pywrapcp.RoutingIndexManager(
        len(request.distance_matrix), request.num_vehicles, request.depot
    )

    # 2. Routing Model
    routing = pywrapcp.RoutingModel(manager)

    # 3. Distance callback to calculate travel cost
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return request.distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # 4. Search parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    # 5. Solve the CVRP
    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        raise HTTPException(status_code=400, detail="No solution found for given matrix.")

    # 6. Format the output sequence to return to Java backend
    routes = {}
    total_distance = 0

    for vehicle_id in range(request.num_vehicles):
        index = routing.Start(vehicle_id)
        route_sequence = []
        route_distance = 0

        while not routing.IsEnd(index):
            route_sequence.append(manager.IndexToNode(index))
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)

        route_sequence.append(manager.IndexToNode(index))
        routes[f"vehicle_{vehicle_id}"] = route_sequence
        total_distance += route_distance

    return {"routes": routes, "total_distance": total_distance}