import { BadRequestException } from '@nestjs/common';
import { BadRequest } from '@/commons/exceptions';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  /**
   * Builds the minimal ArgumentsHost surface used by the filter.
   */
  function createHostMock() {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, url: '/test' }),
        getResponse: () => ({ status, json }),
      }),
    };

    return { host: host as never, status, json };
  }

  it('preserves detailed validation messages from BadRequestException', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHostMock();

    filter.catch(
      new BadRequestException(['fullName must be longer than 2 characters']),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: ['fullName must be longer than 2 characters'],
      code: 'BAD_REQUEST',
    });
  });

  it('preserves custom string messages from BadRequestException', () => {
    const filter = new AllExceptionsFilter();
    const { host, json } = createHostMock();

    filter.catch(new BadRequestException('Patient not found'), host);

    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Patient not found',
      code: 'BAD_REQUEST',
    });
  });

  it('preserves CustomException status and message', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHostMock();

    filter.catch(
      new BadRequest('Care group code is not registered to an active subscription'),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Care group code is not registered to an active subscription',
      code: 'INVALID_INPUT',
    });
  });

  it('masks unexpected 500 runtime errors with Internal server error message', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHostMock();

    filter.catch(new Error('Database connection pool exhausted'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  });
});
