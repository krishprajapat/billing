import { RequestHandler } from "express";
import {
  ApiResponse,
  Area,
  CreateAreaRequest,
  UpdateAreaRequest,
} from "@shared/api";
import { supabaseDatabase } from "../database/supabase-models";

export const getAreas: RequestHandler = async (_req, res) => {
  try {
    const areas = await supabaseDatabase.getAreas();
    const response: ApiResponse<Area[]> = { success: true, data: areas };
    res.json(response);
  } catch (error) {
    console.error("Error fetching areas:", error);
    res.status(500).json({ success: false, error: "Failed to fetch areas" });
  }
};

export const getAreaById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await supabaseDatabase.getAreaById(parseInt(id));
    if (!area) {
      return res.status(404).json({ success: false, error: "Area not found" });
    }
    const response: ApiResponse<Area> = { success: true, data: area };
    res.json(response);
  } catch (error) {
    console.error("Error fetching area:", error);
    res.status(500).json({ success: false, error: "Failed to fetch area" });
  }
};

export const createArea: RequestHandler = async (req, res) => {
  try {
    const data: CreateAreaRequest = req.body;
    if (!data.name?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Area name is required" });
    }
    const area = await supabaseDatabase.createArea(data);
    const response: ApiResponse<Area> = {
      success: true,
      data: area,
      message: "Area created successfully",
    };
    res.status(201).json(response);
  } catch (error: any) {
    console.error("Error creating area:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to create area",
    });
  }
};

export const updateArea: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateAreaRequest = req.body;
    const area = await supabaseDatabase.updateArea(parseInt(id), data);
    if (!area) {
      return res.status(404).json({ success: false, error: "Area not found" });
    }
    const response: ApiResponse<Area> = {
      success: true,
      data: area,
      message: "Area updated successfully",
    };
    res.json(response);
  } catch (error: any) {
    console.error("Error updating area:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to update area",
    });
  }
};

export const deleteArea: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await supabaseDatabase.deleteArea(parseInt(id));
    if (!success) {
      return res.status(400).json({
        success: false,
        error:
          "Cannot delete area. It may not exist or has assigned customers/workers.",
      });
    }
    const response: ApiResponse = {
      success: true,
      message: "Area deleted successfully",
    };
    res.json(response);
  } catch (error: any) {
    console.error("Error deleting area:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to delete area",
    });
  }
};
