/* jshint esversion: 6 */
// testing simple-git (again)


const catchAsyncErrors = fn => {
  return (req, res, next) => {
    const routePromise = fn(req, res, next);
    if (routePromise.catch) {
      routePromise.catch(err => next(err));
    }
  };
};

module.exports.catchAsync = catchAsyncErrors;