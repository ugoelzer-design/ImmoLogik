import { getPaginationOptions } from './pagination';

describe('getPaginationOptions', () => {
  it('keeps list endpoints unpaginated by default', () => {
    expect(getPaginationOptions()).toEqual({});
  });

  it('converts page and pageSize to skip and take', () => {
    expect(getPaginationOptions({ page: '3', pageSize: '25' })).toEqual({
      skip: 50,
      take: 25,
    });
  });

  it('uses safe defaults and caps page size', () => {
    expect(getPaginationOptions({ page: 'x', pageSize: '500' })).toEqual({
      skip: 0,
      take: 100,
    });
  });
});
