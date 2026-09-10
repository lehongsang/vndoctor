import { BadRequestException } from '@nestjs/common';
import { BadRequest } from '@/commons/exceptions';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ErrorCode } from '../exceptions/error-codes';

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

  it('maps BadRequestException to BAD_REQUEST errorCode', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHostMock();

    filter.catch(
      new BadRequestException(['fullName must be longer than 2 characters']),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      errorCode: 'BAD_REQUEST',
    });
  });

  it('preserves CustomException errorCode', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHostMock();

    filter.catch(
      new BadRequest(ErrorCode.CARE_SUBSCRIPTION_NOT_FOUND),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      errorCode: ErrorCode.CARE_SUBSCRIPTION_NOT_FOUND,
    });
  });

  it('masks unexpected 500 runtime errors with INTERNAL_SERVER_ERROR', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHostMock();

    filter.catch(new Error('Database connection pool exhausted'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  });
});
