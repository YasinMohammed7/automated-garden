import 'reflect-metadata';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreatePlantDto } from './create-plant.dto.js';

function makeDto(overrides: Record<string, unknown> = {}): CreatePlantDto {
  const instance = new CreatePlantDto();
  Object.assign(instance, {
    plantName: 'Tomato',
    species: 'Solanum lycopersicum',
    plantType: 'vegetable',
    plantationDate: '2026-05-01',
    surfaceAreaRequired: 1.5,
    idealHumidityLevel: 60,
    ...overrides,
  });
  return instance;
}

async function errorsFor(overrides: Record<string, unknown> = {}) {
  return validate(makeDto(overrides));
}

describe('CreatePlantDto', () => {
  it('accepts a valid plant payload', async () => {
    const errors = await errorsFor();
    expect(errors).toHaveLength(0);
  });

  it('accepts idealHumidityLevel at the bounds 0 and 100', async () => {
    const lowerBoundErrors = await errorsFor({ idealHumidityLevel: 0 });
    expect(lowerBoundErrors).toHaveLength(0);

    const upperBoundErrors = await errorsFor({ idealHumidityLevel: 100 });
    expect(upperBoundErrors).toHaveLength(0);
  });

  it('rejects idealHumidityLevel below 0', async () => {
    const errors = await errorsFor({ idealHumidityLevel: -1 });
    expect(errors.some((e) => e.property === 'idealHumidityLevel')).toBe(true);
  });

  it('rejects idealHumidityLevel above 100', async () => {
    const errors = await errorsFor({ idealHumidityLevel: 101 });
    expect(errors.some((e) => e.property === 'idealHumidityLevel')).toBe(true);
  });

  it('rejects a non-integer idealHumidityLevel', async () => {
    const errors = await errorsFor({ idealHumidityLevel: 50.5 });
    expect(errors.some((e) => e.property === 'idealHumidityLevel')).toBe(true);
  });

  it('rejects an invalid plantType', async () => {
    const errors = await errorsFor({ plantType: 'shrub' });
    expect(errors.some((e) => e.property === 'plantType')).toBe(true);
  });

  it('rejects a negative surfaceAreaRequired', async () => {
    const errors = await errorsFor({ surfaceAreaRequired: -1 });
    expect(errors.some((e) => e.property === 'surfaceAreaRequired')).toBe(true);
  });
});
