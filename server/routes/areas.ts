import { RequestHandler } from "express";
import { ApiResponse, Area, CreateAreaRequest, UpdateAreaRequest } from "@shared/api";
import { db } from "../database/models";

export const getAreas: RequestHandler = (req, res) => {
  try {
    const areas = db.getAreas();
    
    const response: ApiResponse<Area[]> = {
      success: true,
      data: areas,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch areas'
    });
  }
};

export const getAreaById: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const area = db.getAreaById(parseInt(id));
    
    if (!area) {
      return res.status(404).json({
        success: false,
        error: 'Area not found'
      });
    }
    
    const response: ApiResponse<Area> = {
      success: true,
      data: area,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching area:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch area'
    });
  }
};

export const createArea: RequestHandler = (req, res) => {
  try {
    const data: CreateAreaRequest = req.body;
    
    // Validate required fields
    if (!data.name?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Area name is required'
      });
    }
    
    // Check if area name already exists
    const existingAreas = db.getAreas();
    const nameExists = existingAreas.some(a => 
      a.name.toLowerCase() === data.name.toLowerCase()
    );
    
    if (nameExists) {
      return res.status(400).json({
        success: false,
        error: 'Area name already exists'
      });
    }
    
    const area = db.createArea(data);
    
    const response: ApiResponse<Area> = {
      success: true,
      data: area,
      message: 'Area created successfully'
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating area:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create area'
    });
  }
};

export const updateArea: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateAreaRequest = req.body;
    
    // Validate area exists
    const existingArea = db.getAreaById(parseInt(id));
    if (!existingArea) {
      return res.status(404).json({
        success: false,
        error: 'Area not found'
      });
    }
    
    // Check if new name already exists (excluding current area)
    if (data.name) {
      const areas = db.getAreas();
      const nameExists = areas.some(a => 
        a.id !== parseInt(id) && 
        a.name.toLowerCase() === data.name!.toLowerCase()
      );
      
      if (nameExists) {
        return res.status(400).json({
          success: false,
          error: 'Area name already exists'
        });
      }
    }
    
    const area = db.updateArea(parseInt(id), data);
    
    if (!area) {
      return res.status(404).json({
        success: false,
        error: 'Area not found'
      });
    }
    
    const response: ApiResponse<Area> = {
      success: true,
      data: area,
      message: 'Area updated successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error updating area:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update area'
    });
  }
};

export const deleteArea: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    
    const success = db.deleteArea(parseInt(id));
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete area. It may not exist or has assigned customers/workers.'
      });
    }
    
    const response: ApiResponse = {
      success: true,
      message: 'Area deleted successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error deleting area:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete area'
    });
  }
};
