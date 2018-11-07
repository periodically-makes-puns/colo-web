/* jshint esversion: 6 */

$(document).ready(() => {
  $(document.body).on("click", "#signup", (e) => {
    e.preventDefault();
    $.post('/user/signup', {"_csrf": $("#csrf").val()}); 
    location.reload(true);
  });
  $(document.body).on("click", "#vote", (e) => {
    e.preventDefault();
    location.href='/user/respond';
  });
  $(document.body).on("click", "#vote", (e) => {
    e.preventDefault();
    location.href='/user/vote';
  });
  $(document.body).on("click", "#logout", (e) => {
    e.preventDefault();
    location.href = "/user/logout";
  })
});