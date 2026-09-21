import type { ValueTransformer } from 'typeorm';
import type { GeoPoint } from '../commons/interfaces/app.interface';

export const PointTransformer: ValueTransformer = {
  /**
   * Deserialize the value from the database.
   * PostgreSQL returns 'point' as a string like "(lng,lat)".
   */
  from: (value: string | null): GeoPoint | null => {
    if (!value) {
      return null;
    }
    const match = value.match(/\(([^,]+),([^)]+)\)/);
    if (!match) {
      return null;
    }
    return {
      longitude: parseFloat(match[1]),
      latitude: parseFloat(match[2]),
    };
  },

  /**
   * Serialize the value to the database.
   * PostgreSQL expects 'point' as a string like "(lng,lat)".
   */
  to: (value: GeoPoint | null): string | null => {
    if (!value) {
      return null;
    }
    return `(${value.longitude},${value.latitude})`;
  },
};

/**
 * TypeORM transformer to parse PostgreSQL decimal/numeric columns (which are returned as strings by default)
 * into JavaScript numbers for proper API responses and calculations.
 */
export const DecimalTransformer: ValueTransformer = {
  /**
   * Deserialize decimal string from PostgreSQL to JavaScript number.
   */
  from: (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
  },

  /**
   * Serialize numeric value to database.
   */
  to: (value: number | string | null | undefined): number | string | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return value;
  },
};
