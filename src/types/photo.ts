export interface Photo {
  readonly src: string;
  readonly name: string;
  readonly date: string;
  /** ISO capture date, retaining only the month or time precision available. */
  readonly takenAt: string;
  readonly width: number;
  readonly height: number;
}
