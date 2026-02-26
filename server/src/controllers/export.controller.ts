import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as exportService from '../services/export.service.js';

export async function exportData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const format = (req.query.format as string) === 'csv' ? 'csv' : 'json';
    const sectionsParam = (req.query.sections as string) || 'incomes,expenses,categories';
    const validSections = ['incomes', 'expenses', 'categories'] as const;
    const sections = sectionsParam.split(',').filter(s => validSections.includes(s as any)) as typeof validSections[number][];

    if (sections.length === 0) {
      res.status(400).json({ error: 'No valid sections specified' });
      return;
    }

    const result = await exportService.exportData(req.userId!, format, sections);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  } catch (err) {
    next(err);
  }
}
