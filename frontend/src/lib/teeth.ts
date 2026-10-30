// Numeración dental FDI y conversión a Universal (RF-03).

// Dentición permanente (32 dientes) en orden visual.
export const FDI_PERMANENT_UPPER = [
  '18', '17', '16', '15', '14', '13', '12', '11',
  '21', '22', '23', '24', '25', '26', '27', '28',
];
export const FDI_PERMANENT_LOWER = [
  '48', '47', '46', '45', '44', '43', '42', '41',
  '31', '32', '33', '34', '35', '36', '37', '38',
];

// Dentición temporal / decidua (20 dientes).
export const FDI_PRIMARY_UPPER = [
  '55', '54', '53', '52', '51', '61', '62', '63', '64', '65',
];
export const FDI_PRIMARY_LOWER = [
  '85', '84', '83', '82', '81', '71', '72', '73', '74', '75',
];

// FDI -> Universal (permanentes: 1-32).
const UNIVERSAL_PERMANENT: Record<string, string> = {
  '18': '1', '17': '2', '16': '3', '15': '4', '14': '5', '13': '6', '12': '7', '11': '8',
  '21': '9', '22': '10', '23': '11', '24': '12', '25': '13', '26': '14', '27': '15', '28': '16',
  '38': '17', '37': '18', '36': '19', '35': '20', '34': '21', '33': '22', '32': '23', '31': '24',
  '41': '25', '42': '26', '43': '27', '44': '28', '45': '29', '46': '30', '47': '31', '48': '32',
};

// FDI -> Universal (temporales: A-T).
const UNIVERSAL_PRIMARY: Record<string, string> = {
  '55': 'A', '54': 'B', '53': 'C', '52': 'D', '51': 'E',
  '61': 'F', '62': 'G', '63': 'H', '64': 'I', '65': 'J',
  '75': 'K', '74': 'L', '73': 'M', '72': 'N', '71': 'O',
  '81': 'P', '82': 'Q', '83': 'R', '84': 'S', '85': 'T',
};

export type Notation = 'FDI' | 'UNIVERSAL';
export type DentitionKind = 'PERMANENTE' | 'TEMPORAL';

export function toNotation(fdi: string, notation: Notation): string {
  if (notation === 'FDI') return fdi;
  return UNIVERSAL_PERMANENT[fdi] ?? UNIVERSAL_PRIMARY[fdi] ?? fdi;
}

export function rowsFor(dentition: DentitionKind) {
  return dentition === 'PERMANENTE'
    ? { upper: FDI_PERMANENT_UPPER, lower: FDI_PERMANENT_LOWER }
    : { upper: FDI_PRIMARY_UPPER, lower: FDI_PRIMARY_LOWER };
}
