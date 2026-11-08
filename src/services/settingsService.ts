import { db } from '../database/db'
import type { BusinessSettings } from '../types/settings'

const SETTINGS_ID = 'main'

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const savedSettings = await db.settings.get(SETTINGS_ID)

  if (savedSettings) {
    return savedSettings
  }

  return {
    id: SETTINGS_ID,
    businessName: '',
    description: '',
    createdAt: '',
    updatedAt: '',
  }
}

export async function saveBusinessSettings(
  businessName: string,
  description: string,
): Promise<BusinessSettings> {
  const cleanName = businessName.trim()
  const cleanDescription = description.trim()

  if (!cleanName) {
    throw new Error('Debes escribir el nombre del negocio.')
  }

  if (cleanName.length > 60) {
    throw new Error('El nombre no puede superar los 60 caracteres.')
  }

  if (cleanDescription.length > 180) {
    throw new Error('La descripción no puede superar los 180 caracteres.')
  }

  const previous = await db.settings.get(SETTINGS_ID)
  const now = new Date().toISOString()

  const settings: BusinessSettings = {
    id: SETTINGS_ID,
    businessName: cleanName,
    description: cleanDescription,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  }

  await db.settings.put(settings)

  return settings
}