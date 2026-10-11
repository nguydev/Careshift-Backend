import { Router } from "express";
import { IncidentController } from "./incident.controller";

const router = Router();
router.route("/add").post(IncidentController.addIncident);
router.route("/get").get(IncidentController.getIncidents);

export const IncidentRoute = router;
