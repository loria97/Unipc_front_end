import { EuroCentsPipe } from './euro-cents.pipe';

describe('EuroCentsPipe', () => {
  let pipe: EuroCentsPipe;

  beforeEach(() => {
    pipe = new EuroCentsPipe();
  });

  it('formatta un importo intero in euro', () => {
    const result = pipe.transform(60000);

    expect(result).toContain('600,00');
    expect(result).toContain('€');
  });

  it('formatta un importo con decimali', () => {
    const result = pipe.transform(49999);

    expect(result).toContain('499,99');
  });

  it('formatta zero', () => {
    const result = pipe.transform(0);

    expect(result).toContain('0,00');
  });

  it('formatta un importo sotto l\'euro', () => {
    const result = pipe.transform(50);

    expect(result).toContain('0,50');
  });
});
