import { ITimeCalculator } from '../interfaces/services';

export class TimeCalculatorService implements ITimeCalculator {
  private readonly TIME_RATES = {
    A: 0.01,
    B: 0.008,
    C: 0.012
  };

  calculateTime(warehouse: string, distance: number): number {
    const timePerMile = this.getTimePerMile(warehouse);
    return distance * timePerMile;
  }

  private getTimePerMile(warehouse: string): number {
    switch (warehouse) {
      case 'A':
        return this.TIME_RATES.A;
      case 'B':
        return this.TIME_RATES.B;
      case 'C':
        return this.TIME_RATES.C;
      default:
        return this.TIME_RATES.A;
    }
  }
}