/* Redirect shim: #/list?id=X → #/lists?id=X */
SE.titles.list = 'Shopping Lists';
SE.views.list = function (el, p) {
  SE.go('lists', { params: p.id ? { id: p.id } : undefined });
  return function () {};
};
