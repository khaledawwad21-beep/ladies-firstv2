
const INITIAL_CATS={"مكياج": {"ar": "مكياج", "en": "Makeup", "icon": "💄", "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZjdjYmQ4Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZThkOWVjIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+8J+ShDwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPtmF2YPZitin2Kw8L3RleHQ+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjY2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIyOCIgZmlsbD0iIzYzMzQ1ZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5NYWtldXA8L3RleHQ+CiAgICA8L3N2Zz4="}, "عطور": {"ar": "عطور", "en": "Perfumes", "icon": "🌸", "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZWZkMGRmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZGVkNWU5Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+8J+MuDwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPti52LfZiNixPC90ZXh0PgogICAgPHRleHQgeD0iNDUwIiB5PSI2NjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjgiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+UGVyZnVtZXM8L3RleHQ+CiAgICA8L3N2Zz4="}, "ساعات": {"ar": "ساعات", "en": "Watches", "icon": "⌚", "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZTRkZWNmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZDdlMmM2Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+4oyaPC90ZXh0PgogICAgPHRleHQgeD0iNDUwIiB5PSI2MTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iNDYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+2LPYp9i52KfYqjwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjY1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI4IiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPldhdGNoZXM8L3RleHQ+CiAgICA8L3N2Zz4="}, "شنط": {"ar": "شنط", "en": "Bags", "icon": "👜", "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZWRkNmNjIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZTRkN2VhIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+8J+RnDwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPti02YbYtzwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjY1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI4IiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPkJhZ3M8L3RleHQ+CiAgICA8L3N2Zz4="}};
const INITIAL_PRODUCTS=[{"id": 1, "cat": "مكياج", "name": "طقم مكياج فاخر", "en": "Luxury Makeup Set", "price": 89, "old": 109, "discount": 20, "onSale": true, "offerLabel": true, "icon": "💄", "desc": "مجموعة أنيقة للاستخدام اليومي والمناسبات.", "images": ["data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZjdjYmQ4Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZThkOWVjIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+8J+ShDwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPti32YLZhSDZhdmD2YrYp9isINmB2KfYrtixPC90ZXh0PgogICAgPHRleHQgeD0iNDUwIiB5PSI2NjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjgiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+TGFkaWVzIEZpcnN0PC90ZXh0PgogICAgPC9zdmc+"]}, {"id": 2, "cat": "عطور", "name": "عطر نسائي Blossom", "en": "Blossom Women Perfume", "price": 119, "old": 149, "discount": 20, "onSale": true, "offerLabel": true, "icon": "🌸", "desc": "رائحة ناعمة وأنيقة تدوم طوال اليوم.", "images": ["data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZWZkMGRmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZGVkNWU5Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+8J+MuDwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPkJsb3Nzb208L3RleHQ+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjY2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIyOCIgZmlsbD0iIzYzMzQ1ZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5Xb21lbiBQZXJmdW1lPC90ZXh0PgogICAgPC9zdmc+"]}, {"id": 3, "cat": "ساعات", "name": "ساعة نسائية كلاسيكية", "en": "Classic Women Watch", "price": 159, "old": 199, "discount": 20, "onSale": true, "offerLabel": true, "icon": "⌚", "desc": "تصميم راقٍ يناسب الإطلالات اليومية.", "images": ["data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZTRkZWNmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZDdlMmM2Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+4oyaPC90ZXh0PgogICAgPHRleHQgeD0iNDUwIiB5PSI2MTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iNDYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+2LPYp9i52Kkg2YPZhNin2LPZitmD2YrYqTwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjY1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI4IiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPkNsYXNzaWMgV2F0Y2g8L3RleHQ+CiAgICA8L3N2Zz4="]}, {"id": 4, "cat": "شنط", "name": "حقيبة نسائية أنيقة", "en": "Elegant Women Bag", "price": 129, "old": 169, "discount": 24, "onSale": true, "offerLabel": true, "icon": "👜", "desc": "حقيبة عملية وأنيقة مع مساحة مناسبة.", "images": ["data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZWRkNmNjIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZTRkN2VhIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+8J+RnDwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPtit2YLZitio2Kkg2KPZhtmK2YLYqTwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjY1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI4IiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPkVsZWdhbnQgQmFnPC90ZXh0PgogICAgPC9zdmc+"]}, {"id": 5, "cat": "مكياج", "name": "روج Velvet", "en": "Velvet Lipstick", "price": 39, "old": 49, "discount": 20, "onSale": true, "offerLabel": true, "icon": "💋", "desc": "لون غني بلمسة مخملية.", "images": ["data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZjNjMmNmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZThkNGU0Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+8J+SizwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPtix2YjYrCBWZWx2ZXQ8L3RleHQ+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjY2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIyOCIgZmlsbD0iIzYzMzQ1ZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5WZWx2ZXQgTGlwc3RpY2s8L3RleHQ+CiAgICA8L3N2Zz4="]}, {"id": 6, "cat": "عطور", "name": "عطر Rose Mist", "en": "Rose Mist Perfume", "price": 99, "old": 125, "discount": 21, "onSale": true, "offerLabel": true, "icon": "🌹", "desc": "نفحات وردية ناعمة ومميزة.", "images": ["data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZjFjYmQ5Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZTRkN2VjIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+8J+MuTwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPlJvc2UgTWlzdDwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjY1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI4IiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPldvbWVuIFBlcmZ1bWU8L3RleHQ+CiAgICA8L3N2Zz4="]}, {"id": 7, "cat": "ساعات", "name": "ساعة Rose Gold", "en": "Rose Gold Watch", "price": 179, "old": 219, "discount": 18, "onSale": true, "offerLabel": true, "icon": "⌚", "desc": "لمسة أنثوية فاخرة.", "images": ["data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZTlkOWQyIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZTVkNWU4Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+4oyaPC90ZXh0PgogICAgPHRleHQgeD0iNDUwIiB5PSI2MTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iNDYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+Um9zZSBHb2xkPC90ZXh0PgogICAgPHRleHQgeD0iNDUwIiB5PSI2NjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjgiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+UHJlbWl1bSBXYXRjaDwvdGV4dD4KICAgIDwvc3ZnPg=="]}, {"id": 8, "cat": "شنط", "name": "Mini Shoulder Bag", "en": "Mini Shoulder Bag", "price": 109, "old": 139, "discount": 22, "onSale": true, "offerLabel": true, "icon": "👜", "desc": "حقيبة صغيرة وخفيفة للخروجات.", "images": ["data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iOTAwIiB2aWV3Qm94PSIwIDAgOTAwIDkwMCI+CiAgICA8ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBzdG9wLWNvbG9yPSIjZWZkOWNmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZTFkOGVhIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjkwMCIgcng9IjcwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgICA8Y2lyY2xlIGN4PSI0NTAiIGN5PSIzNjUiIHI9IjE3NSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iLjcyIi8+CiAgICA8dGV4dCB4PSI0NTAiIHk9IjQwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMjAiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+8J+RnDwvdGV4dD4KICAgIDx0ZXh0IHg9IjQ1MCIgeT0iNjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjNjMzNDVlIiBmb250LWZhbWlseT0iQXJpYWwiPk1pbmkgQmFnPC90ZXh0PgogICAgPHRleHQgeD0iNDUwIiB5PSI2NjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjgiIGZpbGw9IiM2MzM0NWUiIGZvbnQtZmFtaWx5PSJBcmlhbCI+U2hvdWxkZXIgQmFnPC90ZXh0PgogICAgPC9zdmc+"]}];
const LOGO="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIiB2aWV3Qm94PSIwIDAgNTAwIDUwMCI+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjM1IiBmaWxsPSIjZmJmNGVjIiBzdHJva2U9IiNlOThlYWUiIHN0cm9rZS13aWR0aD0iMTIiLz4KPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMDUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2E5YjI4YSIgc3Ryb2tlLXdpZHRoPSI0Ii8+Cjx0ZXh0IHg9IjI1MCIgeT0iMjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjU1IiBmb250LWZhbWlseT0iR2VvcmdpYSIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzYzMzQ1ZSI+TGFkaWVzPC90ZXh0Pgo8dGV4dCB4PSIyNTAiIHk9IjI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSI1NSIgZm9udC1mYW1pbHk9Ikdlb3JnaWEiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiM2MzM0NWUiPkZpcnN0PC90ZXh0Pgo8dGV4dCB4PSIyNTAiIHk9IjMzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxOCIgbGV0dGVyLXNwYWNpbmc9IjUiIGZpbGw9IiNhODg5YjciPk9OTElORSBTVE9SRTwvdGV4dD4KPC9zdmc+";
const OFFER="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMTcwIiB2aWV3Qm94PSIwIDAgNTAwIDE3MCI+CjxwYXRoIGQ9Ik0zNSA4NSBRNjAgMjUgMTI1IDM1IFExOTAgNSAyNTAgMzUgUTMxMCA1IDM3NSAzNSBRNDQwIDI1IDQ2NSA4NSBRNDQwIDE0NSAzNzUgMTM1IFEzMTAgMTY1IDI1MCAxMzUgUTE5MCAxNjUgMTI1IDEzNSBRNjAgMTQ1IDM1IDg1WiIgZmlsbD0iIzYzMzQ1ZSIvPgo8Y2lyY2xlIGN4PSI3MCIgY3k9Ijg1IiByPSI3IiBmaWxsPSIjZTk4ZWFlIi8+PGNpcmNsZSBjeD0iNDMwIiBjeT0iODUiIHI9IjciIGZpbGw9IiNhOWIyOGEiLz4KPHRleHQgeD0iMjUwIiB5PSI5MyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIzOCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjZmZmIj7ZhNij2KzZhNmDINiz2YrYr9iq2Yo8L3RleHQ+Cjwvc3ZnPg==";
const DEFAULT_HERO={logo:LOGO,image:LOGO};
function load(k,d){try{const x=localStorage.getItem(k);return x?JSON.parse(x):d}catch(e){return d}}
function productStoragePayload(list){return (Array.isArray(list)?list:[]).map(p=>{const q={...p};delete q.images;return q})}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(k==='lf_products'?productStoragePayload(v):v));return true}catch(e){try{localStorage.removeItem(k);localStorage.setItem(k,JSON.stringify(k==='lf_products'?productStoragePayload(v):v));return true}catch(e2){return false}}}
function normalizeProductImages(p){if(!p)return p;const mains=Array.isArray(p.mainImages)?p.mainImages.filter(Boolean):((p.images||[]).filter(Boolean).slice(0,1));const subs=Array.isArray(p.subImages)?p.subImages.filter(Boolean):((p.images||[]).filter(Boolean).slice(1));p.mainImages=mains;p.subImages=subs;p.images=[...mains,...subs];return p}
function mainImagesOf(p){return normalizeProductImages(p).mainImages||[]}
function subImagesOf(p){return normalizeProductImages(p).subImages||[]}
let products=[],cats={},brands={},cart=load('lf_cart',[]),heroSettings=load('lf_hero',DEFAULT_HERO);
let storeCommerceSettings={visaDiscountPercent:0,whatsappNumber:'00972562499924',shippingFees:{westbank:20,jerusalem:35,inside:70}};
function storeWhatsAppDigits(value=storeCommerceSettings.whatsappNumber){
  let digits=String(value||'').replace(/\D/g,'');
  if(digits.startsWith('00'))digits=digits.slice(2);
  if(/^0\d{8,10}$/.test(digits))digits='972'+digits.slice(1);
  return digits.length>=8?digits:'972562499924';
}
function storeWhatsAppHref(message=''){
  const base='https://wa.me/'+storeWhatsAppDigits();
  return message?base+'?text='+encodeURIComponent(message):base;
}
function updateStoreWhatsAppLinks(){
  const href=storeWhatsAppHref();
  ['whatsappFloat','bottomWhatsLink'].forEach(id=>{const el=document.getElementById(id);if(el)el.href=href});
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function safeImg(src,fallback=LOGO){
  if(typeof src!=='string'||/[<>"'\\\x00-\x20]/.test(src))return fallback;
  if(/^\/(?!\/)/.test(src)||/^https?:\/\//i.test(src)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src))return src;
  return fallback;
}
function safeLink(value){try{const u=new URL(String(value),location.origin);return ['http:','https:'].includes(u.protocol)?u.href:'#'}catch{return '#'}}
function applyStoreDescription(value){const el=document.getElementById('brandTagline');if(!el)return;const text=String(value??'').trim().slice(0,80);el.textContent=text;el.hidden=!text}
function openStoreLogoPreview(){const overlay=document.getElementById('storeLogoZoom'),source=document.getElementById('logo'),preview=document.getElementById('storeLogoZoomImage');if(!overlay||!source||!preview)return;preview.src=safeImg(source.currentSrc||source.src,LOGO);preview.alt=source.alt||'شعار المتجر';overlay.classList.add('open');document.body.classList.add('store-logo-zoom-open');document.getElementById('storeLogoZoomClose')?.focus({preventScroll:true})}
function closeStoreLogoPreview(){const overlay=document.getElementById('storeLogoZoom');if(!overlay?.classList.contains('open'))return;overlay.classList.remove('open');document.body.classList.remove('store-logo-zoom-open');document.getElementById('logoZoomTrigger')?.focus({preventScroll:true})}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.getElementById('storeLogoZoom')?.classList.contains('open'))closeStoreLogoPreview()});
function jsAttr(value){return esc(JSON.stringify(String(value??'')))}
function renderHero(){heroSettings=load('lf_hero',DEFAULT_HERO)||DEFAULT_HERO;const logo=document.getElementById('logo'),hero=document.getElementById('heroLogo'),side=document.getElementById('sideLogo');if(logo){logo.src=safeImg(heroSettings.logo);logo.onerror=()=>{logo.onerror=null;logo.src=LOGO}}if(hero){hero.src=safeImg(heroSettings.image);hero.onerror=()=>{hero.onerror=null;hero.src=LOGO}}if(side){side.src=safeImg(heroSettings.logo);side.onerror=()=>{side.onerror=null;side.src=LOGO}}}
function renderCats(){const keys=Object.keys(cats);const countBy={};products.forEach(p=>countBy[p.cat]=(countBy[p.cat]||0)+1);const catsEl=document.getElementById('cats');if(catsEl)catsEl.innerHTML=keys.map(k=>{const c=cats[k]||{};return `<button class="cat" onclick="setCat(${jsAttr(k)})"><img src="${safeImg(c.image,LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"><label>${esc(currentLang==='en'?(c.en||c.ar||k):(c.ar||k))}</label></button>`}).join('');const filter=document.getElementById('filter');if(filter)filter.innerHTML=`<option value="">${currentLang==='en'?'All categories':'كل الفئات'}</option>`+keys.map(k=>`<option value="${esc(k)}">${esc(currentLang==='en'?(cats[k]?.en||cats[k]?.ar||k):(cats[k]?.ar||k))}</option>`).join('');const bf=document.getElementById('brandFilter');if(bf)bf.innerHTML=`<option value="">${currentLang==='en'?'All brands':'كل البراندات'}</option>`+Object.keys(brands).map(k=>`<option value="${esc(k)}">${esc(currentLang==='en'?(brands[k]?.en||brands[k]?.ar||k):(brands[k]?.ar||k))}</option>`).join('');const side=document.getElementById('sideCats');if(side)side.innerHTML=keys.map(k=>{const c=cats[k]||{};return `<button class="sideCat" onclick="setCat(${jsAttr(k)});toggleSideMenu()"><img src="${safeImg(c.image,LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"><b>${esc(currentLang==='en'?(c.en||c.ar||k):(c.ar||k))}</b><span>${countBy[k]||0}</span></button>`}).join('');const sideB=document.getElementById('sideBrands');if(sideB)sideB.innerHTML=Object.keys(brands).map(k=>{const b=brands[k]||{};const n=products.filter(p=>p.brand===k).length;return `<button class="sideCat" onclick="setBrand(${jsAttr(k)});toggleSideMenu()"><img src="${safeImg(b.image,LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"><b>${esc(currentLang==='en'?(b.en||b.ar||k):(b.ar||k))}</b><span>${n}</span></button>`}).join('')}
function setCat(c){document.getElementById('filter').value=c;const bf=document.getElementById('brandFilter');if(bf)bf.value='';document.getElementById('products').scrollIntoView({behavior:'smooth'});renderProducts()}
function setBrand(b){const bf=document.getElementById('brandFilter');if(bf)bf.value=b;const f=document.getElementById('filter');if(f)f.value='';document.getElementById('products').scrollIntoView({behavior:'smooth'});renderProducts()}
function variantList(p){return Array.isArray(p.variants)?p.variants.filter(v=>v&&String(v.name||'').trim()).map(v=>({name:String(v.name).trim(),stock:Math.max(0,Number(v.stock)||0)})):[]}
function totalStock(p){const vs=variantList(p);return vs.length?vs.reduce((a,v)=>a+v.stock,0):Math.max(0,Number(p.stock)||0)}
function selectedVariant(id){const el=document.getElementById('variant_'+id);return el?el.value:''}
function chooseVariant(id,name,btn){const el=document.getElementById('variant_'+id);if(!el||!btn||btn.disabled)return;el.value=name;const picker=btn.closest('.productVariantPicker');if(picker)picker.querySelectorAll('.variantChoice').forEach(x=>x.classList.toggle('active',x===btn));updateVariantCard(id)}
function updateVariantCard(id){const p=products.find(x=>x.id===id);if(!p)return;const v=selectedVariant(id),stock=variantStock(p,v);const low=document.getElementById('variantLowStock_'+id);if(low){if(stock>0&&stock<=3){low.textContent=lowStockMessage(stock);low.hidden=false}else{low.textContent='';low.hidden=true}}const num=document.getElementById('qtyNum_'+id);const item=findCartItem(id,v);if(num)num.textContent=item?Number(item.qty)||0:0}
function renderVariantChooser(p){const vs=variantList(p);if(!vs.length)return '';const first=vs.find(v=>v.stock>0)?.name||'';const firstStock=first?variantStock(p,first):0;return `<div class="variantBox productVariantPicker"><div class="variantLabel">${currentLang==='en'?'Choose color / option':'اختاري اللون / الخيار'}</div><input type="hidden" id="variant_${p.id}" value="${esc(first)}"><div class="variantChoices">${vs.map(v=>`<button type="button" class="variantChoice ${v.stock<=0?'sold':(v.name===first?'active':'')}" ${v.stock<=0?'disabled aria-disabled="true"':''} onclick="chooseVariant(${p.id},${jsAttr(v.name)},this)">${esc(v.name)}</button>`).join('')}</div><div class="lowStockAlert variantLowStock" id="variantLowStock_${p.id}" ${firstStock>0&&firstStock<=3?'':'hidden'}>${firstStock>0&&firstStock<=3?lowStockMessage(firstStock):''}</div></div>`}
const LANG_KEY='lf_lang';
let currentLang=localStorage.getItem(LANG_KEY)||'ar';
let storefrontGeneralMessage=load('lf_storefront_general_message',{active:false,message:''})||{active:false,message:''};
let storeMaintenanceState=load('lf_maintenance_state',{active:false,message:''})||{active:false,message:''};
function normalizeStorefrontPublicMessage(value){
  if(typeof value==='string')return {active:!!value.trim(),message:value.trim()};
  if(value&&typeof value==='object')return {active:value.active===true,message:String(value.message||'').trim()};
  return {active:false,message:''};
}
function renderStoreTopBar(){
  const el=document.getElementById('topBar');if(!el)return;
  const custom=normalizeStorefrontPublicMessage(storefrontGeneralMessage);
  el.textContent=custom.active&&custom.message
    ? custom.message
    : (currentLang==='en'?'Fast delivery across Palestine • Cash on delivery available':'توصيل سريع داخل فلسطين • الدفع عند الاستلام متاح');
  el.classList.toggle('generalAnnouncement',!!(custom.active&&custom.message));
}
function renderMaintenanceMode(){
  const active=storeMaintenanceState?.active===true;
  let overlay=document.getElementById('maintenanceOverlay');
  if(!active){
    document.body.classList.remove('maintenance-active');
    if(overlay)overlay.remove();
    return;
  }
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='maintenanceOverlay';
    overlay.className='maintenanceOverlay';
    document.body.appendChild(overlay);
  }
  const message=String(storeMaintenanceState.message||'المتجر متوقف مؤقتًا للصيانة. سنعود قريبًا.');
  overlay.innerHTML=`<div class="maintenanceCard"><img src="${safeImg((load('lf_hero',DEFAULT_HERO)||DEFAULT_HERO).logo,LOGO)}" alt="Ladies First"><h1>${currentLang==='en'?'We’ll be back soon':'سنعود قريبًا 🌸'}</h1><p>${esc(message)}</p><small>${currentLang==='en'?'The store is temporarily unavailable.':'المتجر متوقف مؤقتًا، ولوحة الإدارة ما زالت تعمل بشكل طبيعي.'}</small></div>`;
  document.body.classList.add('maintenance-active');
}
function toggleLanguage(){currentLang=currentLang==='ar'?'en':'ar';localStorage.setItem(LANG_KEY,currentLang);document.documentElement.lang=currentLang;document.documentElement.dir=currentLang==='ar'?'rtl':'ltr';document.getElementById('lang').textContent=currentLang==='ar'?'EN':'عربي';renderStaticLang();renderNewUiLang();renderCats();renderProducts();renderFeatureSections();renderCart()}
function renderStaticLang(){const en=currentLang==='en';document.documentElement.lang=currentLang;document.documentElement.dir=en?'ltr':'rtl';renderStoreTopBar();renderMaintenanceMode();document.getElementById('heroTitle').textContent=en?'Everything you need.. in one place':'كل ما تحتاجينه.. في مكان واحد';document.getElementById('heroDesc').textContent=en?'Makeup, perfumes, watches and bags carefully selected to complete your look.':'مكياج، عطور، ساعات وشنط مختارة بعناية لتكملي إطلالتك.';document.getElementById('heroCta').textContent=en?'Shop now':'تسوقي الآن';document.querySelector('.sectionTitle h2').textContent=en?'Shop by category':'تسوقي حسب الفئة';document.getElementById('products').querySelector('h2').textContent=en?'Featured products':'منتجات مختارة';document.querySelector('.brand small').textContent='ONLINE STORE';document.getElementById('search').placeholder=en?'Search for a product...':'ابحثي عن منتج...';document.getElementById('cartTitle').textContent='🛍️ '+(en?'Shopping cart':'سلة التسوق');document.getElementById('whatsappFloat').querySelector('span').textContent=en?'WhatsApp':'واتساب';document.getElementById('footerTagline').textContent=en?'Everything you need.. in one place':'كل ما تحتاجينه.. في مكان واحد';document.getElementById('returnsBtn').textContent=en?'Exchange & Return Policy':'سياسة التبديل والإرجاع';document.getElementById('privacyBtn').textContent=en?'Privacy':'الخصوصية';const sb=document.getElementById('sideBrandsLabel');if(sb)sb.textContent=en?'Brands':'البراندات';const t5=document.getElementById('top5Title');if(t5)t5.textContent=en?'🔥 Top 5 Offers':'🔥 أقوى 5 عروض';const bs=document.getElementById('bestTitle');if(bs)bs.textContent=en?'🏆 Best Sellers':'🏆 الأكثر مبيعًا'}
let searchTimer;function queueSearchHistory(v){clearTimeout(searchTimer);searchTimer=setTimeout(()=>rememberSearch(v),700)}
function rememberSearch(v){const q=String(v||'').trim();if(q.length<2)return;let h=load('lf_search_history',[]);h=[q,...h.filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,5);save('lf_search_history',h);renderHistory()}
function renderHistory(){const h=load('lf_search_history',[]),el=document.getElementById('searchHistory');if(!el)return;el.innerHTML=h.length?h.map(x=>`<button class="historyChip" onclick="useHistory(${jsAttr(x)})">${esc(x)}</button>`).join(''):'';el.style.display=h.length?'flex':'none'}
function toggleHistory(){const el=document.getElementById('searchHistory');renderHistory();if(el)el.style.display=el.style.display==='none'?'flex':'none'}
function useHistory(x){document.getElementById('search').value=x;renderProducts()}
async function joinWaitlist(id){const p=products.find(x=>x.id===id);if(!p)return;const a=getAccount();const defaultName=a?.name||'';const defaultPhone=a?.phone||((a?.type==='whatsapp')?a.contact:'')||'';const name=prompt(currentLang==='en'?'Your name:':'اسمك:',defaultName);if(!name)return;const phone=prompt(currentLang==='en'?'WhatsApp number:':'رقم واتسابك:',defaultPhone);if(!phone)return;const variant=selectedVariant(id)||'';try{const d=await lfFetch('/api/waitlist',{method:'POST',body:JSON.stringify({productId:id,name,phone,variant})});alert(d.alreadyWaiting?(currentLang==='en'?'You are already on the availability list for this item.':'💕 سيدتي، طلبك موجود أصلًا في قائمة التوفر لهذا المنتج 🌸'):(currentLang==='en'?'You have been added to the availability list. We will contact you when it is available.':'💕 تم تسجيلك في قائمة التوفر. سنراسلك على واتساب عند توفره 🌸'))}catch(e){alert(e.message||'تعذر التسجيل في قائمة التوفر') }}
function openPolicy(type){const en=currentLang==='en';const text=type==='about'?(en?'<h2>About Ladies First</h2><p>Ladies First is a curated online boutique bringing together beauty, fragrance, watches and accessories in one elegant place.</p><p>We choose each piece with care and are here to make your shopping experience simple, personal and enjoyable.</p>':'<h2>من نحن</h2><p>Ladies First متجر إلكتروني يجمع لكِ الجمال والعطور والساعات والإكسسوارات المختارة بعناية في مكان واحد.</p><p>نحرص على تقديم تجربة تسوق أنيقة وسهلة، ونبقى إلى جانبكِ من اختيار القطعة حتى وصولها إليكِ.</p>'):type==='returns'?(en?'<h2>Exchange & Return Policy</h2><p>Please contact the store within 12 hours of receiving the order for exchange or return requests. The item must be unused and in its original condition and packaging. Clearance, opened cosmetics, and perfumes cannot be returned unless there is a defect.</p><p>Shipping/return costs are handled according to the reason for return and the store confirmation.</p>':'<h2>سياسة التبديل والإرجاع</h2><p>يرجى التواصل مع المتجر خلال 12 ساعة من استلام الطلب لطلبات التبديل أو الإرجاع. يجب أن يكون المنتج غير مستخدم وبحالته وتغليفه الأصليين. المنتجات المخفضة جدًا ومستحضرات التجميل والعطور المفتوحة لا تُرجع إلا في حال وجود عيب.</p><p>تكاليف الشحن أو الإرجاع تحدد حسب سبب الإرجاع وبعد تأكيد المتجر.</p>'):(en?'<h2>Privacy</h2><p>Your order information is used only to process and contact you about your order.</p>':'<h2>الخصوصية</h2><p>تُستخدم بيانات الطلب فقط لمعالجة الطلب والتواصل معك بخصوصه.</p>');document.getElementById('policyContent').innerHTML=text;document.getElementById('policyModal').style.display='flex'}
function closePolicy(){document.getElementById('policyModal').style.display='none'}
function shippingInfo(region){const fees=storeCommerceSettings.shippingFees||{westbank:20,jerusalem:35,inside:70},discounts=storeCommerceSettings.shippingDiscountPercentages||{westbank:0,jerusalem:0,inside:0};const info={westbank:{ar:'الضفة الغربية',en:'West Bank'},jerusalem:{ar:'القدس',en:'Jerusalem'},inside:{ar:'الداخل',en:'Inside 1948'}}[region]||{ar:'الضفة الغربية',en:'West Bank'};const key=['westbank','jerusalem','inside'].includes(region)?region:'westbank',baseFee=Math.max(0,Number(fees[key]??20)||0),discountPercent=Math.min(100,Math.max(0,Number(discounts[key])||0)),discountAmount=baseFee*discountPercent/100;return {...info,baseFee,discountPercent,discountAmount,fee:Math.max(0,baseFee-discountAmount)}}
function currentShipping(){const r=document.getElementById('shippingRegion')?.value||'westbank';return shippingInfo(r)}
function isOfferActive(p){return !!p.onSale&&Number(p.old)>Number(p.price)&&(!p.offerExpiry||new Date(p.offerExpiry+'T23:59:59').getTime()>=Date.now())}
function weeklyOrderDate(o){const raw=o?.createdAt||o?.timestamp||o?.date;const d=raw instanceof Date?raw:new Date(raw);return Number.isNaN(d.getTime())?null:d}
function isThisWeekOrder(o){const d=weeklyOrderDate(o);return !!d&&d.getTime()>=Date.now()-7*24*60*60*1000}
function salesMap(orders){const m={};(orders||[]).forEach(o=>(o.items||[]).forEach(it=>{const id=it.productId??it.id;if(id==null)return;m[String(id)]=(m[String(id)]||0)+(Number(it.qty)||0)}));return m}
function getTop5(){
  const eligible=products.filter(p=>totalStock(p)>0&&(!p.offerExpiry||new Date(p.offerExpiry+'T23:59:59').getTime()>=Date.now()));
  const selected=eligible.filter(p=>p.top5);
  const offers=eligible.filter(p=>isOfferActive(p));
  const pool=selected.length?selected:offers;
  return [...pool].sort((a,b)=>{const ad=Number(a.old)>Number(a.price)?(Number(a.old)-Number(a.price))/Math.max(1,Number(a.old)):0;const bd=Number(b.old)>Number(b.price)?(Number(b.old)-Number(b.price))/Math.max(1,Number(b.old)):0;return bd-ad}).slice(0,5);
}
function getBestSellers(){
  const server=Array.isArray(window.LF_BEST_SELLERS)?window.LF_BEST_SELLERS:[];
  return server.map(x=>({p:products.find(p=>String(p.id)===String(x.productId)),qty:Number(x.quantity)||0})).filter(x=>x.p&&totalStock(x.p)>0).slice(0,5);
}
function bestSellersEmptyMessage(){
  const en=currentLang==='en',status=window.LF_BEST_SELLERS_STATUS;
  if(status==='error')return en?'Unable to load best sellers. Please refresh to try again.':'تعذر تحميل الأكثر مبيعًا. حدّثي الصفحة للمحاولة مجددًا.';
  if(status!=='ready')return en?'Loading best sellers…':'جاري تحميل الأكثر مبيعًا…';
  return en?'No available best sellers yet.':'لا توجد منتجات متاحة ضمن الأكثر مبيعًا حاليًا.';
}
function scrollFeature(id,dir){const el=document.getElementById(id);if(!el)return;const amount=Math.max(180,Math.round(el.clientWidth*.72));const before=el.scrollLeft;el.scrollBy({left:dir==='left'?-amount:amount,behavior:'smooth'});setTimeout(()=>{if(Math.abs(el.scrollLeft-before)<2){const max=Math.max(0,el.scrollWidth-el.clientWidth);if(max>8)el.scrollLeft=dir==='left'?Math.max(0,before-amount):Math.min(max,before+amount)}},450);}
const ACCOUNT_KEY='lf_account', FAV_KEY='lf_favorites';
function getAccount(){
  const account=load(ACCOUNT_KEY,null);
  if(!account)return null;
  const users=load('lf_users',[]);
  if(!Array.isArray(users)||!users.length)return account;
  let user=null;
  if(account.id!=null) user=users.find(u=>String(u.id||'')===String(account.id));
  if(!user) user=users.find(u=>u.type===account.type&&String(u.contact||'').trim().toLowerCase()===String(account.contact||'').trim().toLowerCase());
  if(!user)return account;
  const synced={...account,...user,password:account.password||user.password};
  if(JSON.stringify(synced)!==JSON.stringify(account)) save(ACCOUNT_KEY,synced);
  return synced;
}
function getFavorites(){return load(FAV_KEY,[]).map(Number).filter(id=>products.some(p=>Number(p.id)===id))}
function saveFavorites(v){const normalized=[...new Set((Array.isArray(v)?v:[]).map(Number).filter(Number.isInteger))];save(FAV_KEY,normalized);updateAccountBadge();if(lfToken())lfPersistFavorites(normalized).catch(e=>console.warn('Favorites save unavailable',e.message))}
function isFavorite(id){return getFavorites().includes(Number(id))}
function toggleFavorite(id){const fav=getFavorites(),n=Number(id);saveFavorites(fav.includes(n)?fav.filter(x=>x!==n):fav.concat(n));renderProducts();renderQuickOffers();if(document.getElementById('accountModal')?.style.display==='flex')renderAccountContent()}
function favoriteCards(){return getFavorites().map(id=>products.find(p=>Number(p.id)===id)).filter(Boolean).map(p=>{const img=safeImg(mainImagesOf(p)[0],LOGO);return `<div class="favCard"><img src="${img}" onclick="openProduct(${p.id})"><div class="fcbody"><b>${esc(currentLang==='en'?(p.en||p.name):p.name)}</b><div>${Number(p.price)||0} ₪</div><button onclick="addSingleToCart(${p.id},selectedVariant(${p.id}));renderAccountContent()">🛍️ نقل للسلة</button><button onclick="toggleFavorite(${p.id})">♥ إزالة</button></div></div>`}).join('')}
function openAccount(){document.getElementById('accountModal').style.display='flex';renderAccountContent();if(lfToken())lfSyncMyOrders().then(()=>renderAccountContent())}
function closeAccount(){document.getElementById('accountModal').style.display='none'}
function getAccountOrders(){const a=getAccount();if(!a)return [];const userId=String(a.serverUserId??a.id??a.user_id??'');return load('lf_orders',[]).filter(o=>{const orderUserId=String(o.user_id??o.userId??'');return (userId&&orderUserId===userId)||o.accountRef===a.contact}).slice(0,20)}
function publicOrderStatusLabel(status){return ({pending:'جديد',confirmed:'مؤكد',processing:'قيد التجهيز',shipped:'تم الشحن',delivered:'تم التسليم',completed:'مكتمل',cancelled:'ملغي'})[String(status||'').toLowerCase()]||String(status||'-')}
function publicOrderRegionLabel(region){return ({westbank:'الضفة',jerusalem:'القدس',inside:'الداخل'})[String(region||'').toLowerCase()]||String(region||'-')}
function publicOrderDetailsHtml(data){
  const o=data?.order||{},items=Array.isArray(data?.items)?data.items:[];
  const payment=String(o.paymentMethod||o.payment_method||'cash').toLowerCase()==='visa'?'Visa — لم يتم تحصيل المبلغ إلكترونياً':'الدفع عند الاستلام';
  const shipping=o.shippingWaived||o.shipping_waived?'معفى':Number(o.shipping??o.shipping_cost??0).toFixed(2)+' ₪';
  const autoPct=Number(o.shippingAutoDiscountPercent??o.shipping_discount_percent??0)||0;
  const autoAmt=Number(o.shippingAutoDiscountAmount??o.shipping_discount_amount??0)||0;
  const manualPct=Number(o.shippingManualDiscountPercent??o.shipping_manual_discount_percent??0)||0;
  const manualAmt=Number(o.shippingManualDiscountAmount??o.shipping_manual_discount_amount??0)||0;
  return `<div class="orderDetail"><div class="orderDetailHead"><b>تفاصيل الطلب #${Number(o.id)||''}</b><span>${o.createdAt||o.created_at?new Date(o.createdAt||o.created_at).toLocaleString('ar') : ''}</span></div><div class="notice">هذا الرابط يعرض تفاصيل الطلب بدون إظهار رقم الهاتف أو العنوان.</div>${orderTrackingHtml({...o,id:o.id,statusHistory:data?.statusHistory||[]})}<p><b>الحالة:</b> ${esc(publicOrderStatusLabel(o.status))}<br><b>طريقة الدفع:</b> ${esc(payment)}<br><b>منطقة التوصيل:</b> ${esc(publicOrderRegionLabel(o.shippingRegion||o.shipping_region))}</p><div class="orderItems">${items.map(it=>`<div class="orderItem">${it.image?`<img src="${esc(it.image)}" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:9px">`:''}<div><b>${it.isGift||it.is_gift?'🎁 هدية — ':''}${esc(it.productName||it.product_name||'منتج')}</b>${(it.variantName||it.variant_name)?`<div>${esc(it.variantName||it.variant_name)}</div>`:''}</div><span>× ${Number(it.quantity)||0}</span><b>${it.isGift||it.is_gift?'0.00':Number(it.total||0).toFixed(2)} ₪</b></div>`).join('')||'<div class="empty">لا توجد تفاصيل منتجات.</div>'}</div><div class="orderSummary">المجموع الفرعي: ${Number(o.subtotal||0).toFixed(2)} ₪<br>خصم الكوبون: -${Number(o.couponDiscount??o.coupon_discount??0).toFixed(2)} ₪<br>خصم Visa: -${Number(o.visaDiscount??o.visa_discount??0).toFixed(2)} ₪<br>خصم الولاء: -${Number(o.loyaltyDiscount??o.loyalty_discount??0).toFixed(2)} ₪<br>التغليف: ${Number(o.packaging??o.packaging_cost??0).toFixed(2)} ₪<br>التوصيل الأساسي: ${Number(o.shippingBaseCost??o.shipping_base_cost??o.shipping??0).toFixed(2)} ₪<br>${autoAmt>0?`خصم التوصيل التلقائي${autoPct?' ('+autoPct.toFixed(2)+'%)':''}: -${autoAmt.toFixed(2)} ₪<br>`:''}${manualAmt>0?`خصم التوصيل اليدوي${manualPct?' ('+manualPct.toFixed(2)+'%)':''}: -${manualAmt.toFixed(2)} ₪<br>`:''}التوصيل المستحق: ${esc(shipping)}<br><b>الإجمالي: ${Number(o.total||0).toFixed(2)} ₪</b></div></div>`;
}
async function openPublicOrderFromUrl(){
  const match=location.pathname.match(/^\/order\/(\d+)\/?$/);
  if(!match)return;
  const id=Number(match[1]),token=new URLSearchParams(location.search).get('token')||'';
  const modal=document.getElementById('orderDetailModal'),host=document.getElementById('orderDetailContent');
  if(!modal||!host)return;
  modal.style.display='flex';
  host.innerHTML='<div class="orderDetail"><div class="notice">جاري تحميل تفاصيل الطلب…</div></div>';
  if(!token){host.innerHTML='<div class="orderDetail"><div class="notice">رابط تفاصيل الطلب غير صالح أو ناقص.</div></div>';return}
  try{
    const data=await lfFetch('/api/public/orders/'+id+'?token='+encodeURIComponent(token));
    host.innerHTML=publicOrderDetailsHtml(data);
  }catch(e){
    host.innerHTML='<div class="orderDetail"><div class="notice">'+esc(e.message||'تعذر تحميل تفاصيل الطلب')+'</div></div>';
  }
}
function returnHistoryHtml(o){
  const rows=Array.isArray(o.returns)?o.returns:[];
  if(!rows.length)return '';
  const status={pending:'قيد المراجعة',approved:'مقبول',rejected:'مرفوض',completed:'مكتمل'};
  return '<div class="orderSummary"><b>سجل الإرجاع والاستبدال</b>'+rows.map(r=>{
    const type=r.request_type==='exchange'?'استبدال':'إرجاع';
    const payer=r.fee_payer==='store'?'المتجر يتحمل رسوم التوصيل':r.fee_payer==='waived'?'معفى من رسوم التوصيل':'رسوم التوصيل على الزبون';
    let settlement='';
    if(r.request_type==='exchange'&&Number(r.exchange_settlement_amount||0)>0){
      const direction=r.exchange_settlement_direction==='customer_to_store'?'على الزبون':'مستحق للزبون';
      const st=r.exchange_settlement_status==='settled'?'تمت التسوية':'التسوية معلقة';
      settlement='<br>فرق السعر: '+Number(r.exchange_settlement_amount).toFixed(2)+' ₪ '+direction+' — '+st+(r.exchange_settlement_method?' ('+esc(r.exchange_settlement_method)+')':'');
    }else if(r.request_type==='return'&&Number(r.return_refund_amount||0)>0){
      const st=r.return_refund_status==='settled'?'تم رد المبلغ':'رد المبلغ معلّق';
      settlement='<br>المبلغ المستحق: '+Number(r.return_refund_amount).toFixed(2)+' ₪ — '+st+(r.return_refund_method?' ('+esc(r.return_refund_method)+')':'');
    }
    return '<div class="notice" style="margin-top:8px"><b>'+type+' × '+Number(r.quantity||1)+'</b> — '+(status[r.status]||esc(r.status||''))+'<br>'+esc(r.reason||'')+'<br>'+payer+settlement+(r.replacement_product_name?'<br>البديل: '+esc(r.replacement_product_name)+(r.replacement_variant_name?' — '+esc(r.replacement_variant_name):''):'')+'</div>';
  }).join('')+'</div>';
}
async function trackCustomerOrder(){
  const orderNumber=document.getElementById('trackOrderNumber')?.value.trim().replace(/[^0-9]/g,'')||'';
  const phone=document.getElementById('trackOrderPhone')?.value.trim()||'';
  const host=document.getElementById('customerOrderTrackingResult');
  if(!host)return;
  if(!orderNumber){host.innerHTML='<div class="notice">أدخلي رقم الطلب للمتابعة.</div>';return}
  host.innerHTML='<div class="notice">جاري البحث عن الطلب…</div>';
  try{
    const d=await lfFetch('/api/orders/track',{method:'POST',body:JSON.stringify({orderNumber,phone})});
    host.innerHTML=orderTrackingHtml({...d.order,id:d.order.id,statusHistory:d.statusHistory||[]})+`<div class="orderSummary">الإجمالي: ${Number(d.order.total||0).toFixed(2)} ₪</div>`;
  }catch(e){
    host.innerHTML='<div class="notice">'+esc(e.message||'لم نعثر على طلب بهذه البيانات')+'</div>';
  }
}
function orderTrackingHtml(o){
  const events=Array.isArray(o?.statusHistory)?o.statusHistory:(Array.isArray(o?.status_history)?o.status_history:[]);
  const current=publicOrderStatusLabel(o?.status||'pending');
  const rows=events.length?events.map(event=>{
    const label=publicOrderStatusLabel(event.status);
    const raw=event.changedAt||event.changed_at;
    return `<div class="orderTrackEvent"><span>✓ ${esc(label)}</span><small>${esc(raw?new Date(raw).toLocaleString('ar-PS'):'')}</small></div>`;
  }).join(''):`<div class="orderTrackEvent"><span>✓ ${esc(current)}</span></div>`;
  return `<section class="orderTrack" aria-label="تتبع الطلب"><b>تتبع الطلب #${Number(o?.id)||''}</b><div class="orderTrackCurrent">الحالة الحالية: <strong>${esc(current)}</strong></div><div class="orderTrackEvents">${rows}</div></section>`;
}
function orderDetailsHtml(o){
  const orderStatus=String(o.status||'').trim().toLowerCase();const eligible=['delivered','completed','تم التسليم','تم التوصيل','مكتمل'].includes(orderStatus);
  const items=(o.items||[]).map(it=>{const orderItemId=it.orderItemId??it.order_item_id??it.id;return `<div class="orderItem ${it.isGift?'giftOrderItem':''}"><div><b>${it.isGift?'🎁 هدية — ':''}${esc(it.name||'منتج')}</b>${it.variant?`<div>اللون: ${esc(it.variant)}</div>`:''}</div><span>× ${Number(it.qty)||1}</span><b>${it.isGift?'0.00':Number(it.price||it.lineTotal||0).toFixed(2)} ₪</b>${eligible&&!it.isGift&&orderItemId?`<button class="add return-request-button" type="button" onclick="openReturnRequest(${o.id},${Number(orderItemId)},${Number(it.qty)||1},${jsAttr(it.name||'منتج')})">↩️ إرجاع / استبدال</button>`:''}</div>`}).join('');
  const autoAmt=Number(o.shippingAutoDiscountAmount||0),manualAmt=Number(o.shippingManualDiscountAmount||0);
  return `<div class="orderDetail"><div class="orderDetailHead"><b>الطلب #${o.id}</b><span>${esc(o.date||'')}</span></div>${orderTrackingHtml(o)}<div class="orderItems">${items||'<div class="empty">لا توجد تفاصيل.</div>'}</div>${eligible?'<div class="notice">سياسة الإرجاع/التبديل: خلال 12 ساعة من استلام الطلب.</div>':''}<div class="orderSummary">المجموع الفرعي: ${Number(o.subtotal||0).toFixed(2)} ₪<br>التوصيل الأساسي: ${Number(o.shippingBaseCost??o.shippingFee??0).toFixed(2)} ₪<br>${autoAmt>0?'خصم توصيل تلقائي: -'+autoAmt.toFixed(2)+' ₪<br>':''}${manualAmt>0?'خصم توصيل إضافي: -'+manualAmt.toFixed(2)+' ₪<br>':''}التوصيل المستحق: ${o.shippingWaived?'معفى':Number(o.shippingFee||0).toFixed(2)+' ₪'}<br><b>الإجمالي: ${Number(o.total||0).toFixed(2)} ₪</b></div>${returnHistoryHtml(o)}<button class="add" type="button" onclick="reorder(${o.id})">🔄 إعادة الطلب</button></div>`;
}
async function returnImageData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('تعذر قراءة الصورة'));r.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('تعذر قراءة الصورة'));img.onload=()=>{let w=img.width,h=img.height,k=Math.min(1,1200/Math.max(w,h));w=Math.round(w*k);h=Math.round(h*k);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',.72))};img.src=r.result};r.readAsDataURL(file)})}
function openReturnRequest(orderId,itemId,maxQty,name){const host=document.getElementById('orderDetailContent');if(!host)return;host.innerHTML=`<div class="orderDetail"><h3>إرجاع / استبدال — ${esc(name)}</h3><div class="notice">يمكن تقديم الطلب خلال 12 ساعة من الاستلام. الصور تساعد الإدارة على مراجعة الحالة.</div><label>نوع الطلب<select id="rrType" class="field"><option value="return">إرجاع</option><option value="exchange">استبدال</option></select></label><label>الكمية<input id="rrQty" class="field" type="number" min="1" max="${maxQty}" value="1"></label><label>السبب<select id="rrReason" class="field"><option value="">اختاري السبب</option><option value="store_damaged">المنتج تالف</option><option value="store_wrong_item">المنتج مختلف عن الطلب</option><option value="store_missing_item">يوجد نقص في الطلب</option><option value="customer_size_color">المقاس أو اللون غير مناسب</option><option value="customer_changed_mind">تغيير رأي</option><option value="other">سبب آخر</option></select></label><label>ملاحظات<textarea id="rrNotes" class="field" rows="3" placeholder="اشرحي الحالة باختصار"></textarea></label><label>صور الحالة — حتى 5 صور<input id="rrImages" class="field" type="file" accept="image/*" multiple></label><button class="add" onclick="submitReturnRequest(${orderId},${itemId},${maxQty})">إرسال الطلب</button><button type="button" onclick="viewOrder(${orderId})">رجوع</button></div>`}
async function submitReturnRequest(orderId,itemId,maxQty){if(!lfToken())return alert('سجلي الدخول أولًا لإرسال طلب الإرجاع أو الاستبدال');const quantity=Number(document.getElementById('rrQty')?.value||0),requestType=document.getElementById('rrType')?.value||'',reasonEl=document.getElementById('rrReason'),reasonCode=reasonEl?.value||'',reason=reasonEl?.selectedOptions?.[0]?.textContent?.trim()||'',notes=document.getElementById('rrNotes')?.value.trim()||'',files=[...(document.getElementById('rrImages')?.files||[])].slice(0,5);if(quantity<1||quantity>maxQty)return alert('الكمية غير صحيحة');if(!reasonCode)return alert('اختاري سبب الطلب');try{const images=[];for(const file of files)images.push(await returnImageData(file));const d=await lfFetch('/api/returns',{method:'POST',body:JSON.stringify({orderId,orderItemId:itemId,quantity,requestType,reasonCode,reason,notes,images})});alert(d.message||'تم إرسال الطلب للمراجعة');viewOrder(orderId)}catch(e){alert(e.message||'تعذر إرسال الطلب')}}
function viewOrder(id){const o=load('lf_orders',[]).find(x=>String(x.id)===String(id));if(!o)return;const m=document.getElementById('orderDetailModal');if(!m)return;document.getElementById('orderDetailContent').innerHTML=orderDetailsHtml(o);m.style.display='flex'}
function closeOrderDetail(){const m=document.getElementById('orderDetailModal');if(m)m.style.display='none';if(/^\/order\/\d+\/?$/.test(location.pathname))history.replaceState(null,'','/')}
function reorder(id){const o=load('lf_orders',[]).find(x=>String(x.id)===String(id));if(!o)return;let added=0,skipped=0,giftsSkipped=0;(o.items||[]).forEach(it=>{if(it.isGift){giftsSkipped++;return}const p=products.find(x=>Number(x.id)===Number(it.productId));if(!p){skipped++;return}const available=variantStock(p,it.variant||'');const want=Math.max(1,Number(it.qty)||1);if(available<=0){skipped++;return}const qty=Math.min(want,available);addToCart(p.id,qty,it.variant||'',it.packagingId||'');added+=qty;if(qty<want)skipped++});closeOrderDetail();closeAccount();openCart();const notes=[];if(skipped)notes.push(skipped+' من القطع لم تعد متوفرة بالكمية المطلوبة.');if(giftsSkipped)notes.push('الهدايا السابقة لا تُعاد تلقائيًا للسلة.');if(notes.length)alert(`تمت إعادة إضافة ${added} قطعة 🌸\n`+notes.join('\n'))}
function renderSideAccountGreeting(){const el=document.getElementById('sideAccountGreeting');if(!el)return;const a=getAccount();el.innerHTML=a?`<div class="sideGreeting">${greetingForAccount(a)}، <b>${esc(a.name||'سيدتي')}</b> 🩷</div><button class="sideAccountBtn" onclick="openAccount();toggleSideMenu()">👤 حسابي وطلباتي</button>`:`<button class="sideAccountBtn" onclick="openAccount();toggleSideMenu()">👤 تسجيل الدخول الاختياري</button>`}
function localPhoneForAccount(a){const raw=String(a?.contact||'').trim();if(!raw)return '';const n=normalizePhone(raw,a?.countryIso||'PS');if(!n.startsWith('+'))return raw;const dial=String(COUNTRY_DIAL_CODES[a?.countryIso||'PS']||'');if(dial&&n.slice(1,1+dial.length)===dial)return '0'+n.slice(1+dial.length);return n.slice(1)}
function accountWaitlistStatusLabel(status){
  return ({waiting:'بانتظار التوفر',notified:'تم الإشعار',closed:'مغلق'})[String(status||'').toLowerCase()]||String(status||'-');
}
function openAccountWaitlistProduct(id){
  closeAccount();
  openProduct(Number(id));
}
async function lfLoadMyWaitlist(){
  const box=document.getElementById('accountWaitlistHistory');
  if(!box||!lfToken())return;
  box.innerHTML='<div class="empty">جاري تحميل سجل التوفر…</div>';
  try{
    const d=await lfFetch('/api/waitlist/mine');
    const rows=Array.isArray(d.requests)?d.requests:[];
    box.innerHTML=rows.length?rows.map(x=>{
      const image=safeImg(x.productImage,LOGO);
      const status=accountWaitlistStatusLabel(x.status);
      const when=x.createdAt?new Date(x.createdAt).toLocaleString('ar-PS'):'';
      const notified=x.notifiedAt?'<small>تم الإشعار: '+esc(new Date(x.notifiedAt).toLocaleString('ar-PS'))+'</small>':'';
      return `<button type="button" class="waitlistHistoryCard" onclick="openAccountWaitlistProduct(${Number(x.productId)})"><img src="${image}" alt=""><span class="waitlistHistoryCopy"><b>${esc(x.productName||'منتج')}</b><small>${x.variant?'الخيار: '+esc(x.variant)+' • ':''}${esc(status)}</small><small>${esc(when)}</small>${notified}</span><span class="waitlistHistoryOpen">فتح المنتج</span></button>`;
    }).join(''):'<div class="empty">لا توجد طلبات في سجل التوفر لهذا الحساب.</div>';
  }catch(e){
    box.innerHTML='<div class="empty">'+esc(e.message||'تعذر تحميل سجل التوفر')+'</div>';
  }
}

function renderAccountContent(){
  const el=document.getElementById('accountContent');
  if(!el)return;
  const a=getAccount(),fav=getFavorites(),orders=getAccountOrders();
  renderSideAccountGreeting();
  if(!a){
    el.innerHTML=`<div class="notice">تسجيل الدخول اختياري. عند تسجيل الدخول تُحفظ طلباتك ومفضلتك وتفضيلاتك مع حسابك.</div>
      <div class="accountMode">
        <button id="actionLogin" class="active" type="button" onclick="setAccountActionMode('login')">تسجيل الدخول</button>
        <button id="actionRegister" type="button" onclick="setAccountActionMode('register')">إنشاء حساب</button>
      </div>
      <div class="accountMode">
        <button id="modeWhats" class="active" type="button" onclick="setAccountMode('whatsapp')">💬 واتساب</button>
        <button id="modeEmail" type="button" onclick="setAccountMode('email')">✉️ إيميل</button>
      </div>
      <div id="accountRegisterFields">
        <input id="accountName" class="field" placeholder="الاسم">
        <div class="genderRow">
          <select id="accountGender" class="field"><option value="female">أنثى</option><option value="male">ذكر</option></select>
          <input id="accountAge" class="field" type="number" min="13" max="120" placeholder="العمر">
        </div>
      </div>
      <div class="phoneIntlBox">
        <div id="accountCountryTools" class="phoneIntlTop">
          <select id="accountCountryCode" class="field countrySelect" onchange="syncCountryDialPreview('accountCountryCode','accountContact')"></select>
          <span class="phoneDialHint" id="accountDialHint">+970</span>
          <button id="gpsCountryBtn" type="button" class="gpsBtn" onclick="detectCountryByGPS('accountCountryCode')">📍 تحديد الدولة تلقائيًا</button>
        </div>
        <input id="accountContact" class="field" placeholder="رقم الواتساب بدون مفتاح الدولة" inputmode="tel" autocomplete="username">
      </div>
      <div id="accountGpsNote" class="gpsNote">📍 الموقع اختياري ويُستخدم فقط لتحديد الدولة تلقائيًا، ولا نحتاج حفظ إحداثياتك.</div>
      <input id="accountPassword" class="field" type="password" minlength="12" autocomplete="current-password" placeholder="كلمة المرور — 12 خانة على الأقل">
      <div id="accountActionHint" class="passwordNote">أدخلي بيانات حسابك لتسجيل الدخول.</div>
      <button id="accountSubmit" class="add" onclick="saveAccount()">تسجيل الدخول</button>
      <button id="accountPasskeyLogin" class="add secondaryAdd" type="button" onclick="customerPasskeyLogin()">🔐 الدخول ببصمة / قفل الجهاز</button>
      <button id="accountRecoveryButton" class="add secondaryAdd" type="button" onclick="showCustomerRecovery()">نسيت كلمة المرور</button>
      <div id="customerRecoveryBox"></div>
      <div class="passwordNote">الدخول بالبصمة يظهر بعد تفعيله مرة واحدة من داخل الحساب على هذا الجهاز.</div>
      <hr><h3>❤️ المفضلة (${fav.length})</h3>
      <div class="favoritesRow">${fav.length?favoriteCards():'<div class="empty">لم تضيفي منتجات للمفضلة بعد.</div>'}</div>`;
    initCountrySelectors();
    setAccountMode(accountMode);
    setAccountActionMode(accountActionMode);
    return;
  }
  const waChecked=a.whatsapp_opt_in===true||a.whatsapp_opt_in===1||a.whatsapp_opt_in==='1'||a.whatsapp_opt_in==='true';
  const contactEditor=a.type==='whatsapp'?`<div class="accountContactEditor"><b>🌍 الدولة ومفتاح واتساب</b><div class="phoneIntlTop"><select id="accountCountryEdit" class="field countrySelect" onchange="syncCountryDialPreview('accountCountryEdit','accountContactEdit')"></select><span class="phoneDialHint" id="accountDialEdit">+970</span><button id="gpsCountryEditBtn" type="button" class="gpsBtn" onclick="detectCountryByGPS('accountCountryEdit')">📍 تحديد تلقائي</button></div><input id="accountContactEdit" class="field phoneValueLtr" dir="ltr" inputmode="tel" autocomplete="tel-national" value="${esc(localPhoneForAccount(a))}" placeholder="رقم واتسابك بدون مفتاح الدولة"><button class="add secondaryAdd" type="button" onclick="updateAccountWhatsAppNumber()">حفظ الدولة / المفتاح / الرقم</button><div class="gpsNote">يمكنك تغيير الدولة أو المفتاح يدويًا في أي وقت حتى لو استخدمتِ GPS.</div></div>`:'';
  el.innerHTML=`<div class="accountGreeting">${greetingForAccount(a)}، ${esc(a.name||'سيدتي')} 🩷</div>
    <div class="success"><div class="accountContactValue">${a.type==='email'?'✉️ ':'💬 '}<span class="phoneValueLtr" dir="ltr">${esc(a.contact||a.email||a.phone||'')}</span></div><b>⭐ نقاطي: ${Number(a.points||0)}</b><br><label class="waPreference"><input id="waOptIn" type="checkbox" ${waChecked?'checked':''}> أوافق على استلام رسائل واتساب لطيفة عن السلة والمنتجات التي اخترتها والعروض ذات الصلة.</label><div class="accountActionRow"><button type="button" onclick="saveWhatsAppOptIn()">حفظ تفضيلات واتساب</button><button type="button" onclick="logoutAccount()">تسجيل خروج</button></div></div>
    ${contactEditor}
    <h3>🔐 الدخول بالبصمة</h3>
    <div id="customerPasskeyStatus" class="notice">جاري التحقق من حالة البصمة…</div>
    <div class="accountActionRow"><button type="button" onclick="enableCustomerPasskey()">تفعيل بصمة هذا الجهاز</button></div>
    <h3>🔐 تغيير كلمة المرور</h3>
    <div class="formgrid"><input id="accountCurrentPassword" class="field" type="password" autocomplete="current-password" placeholder="كلمة المرور الحالية"><input id="accountNewPassword" class="field" type="password" minlength="12" autocomplete="new-password" placeholder="كلمة المرور الجديدة — 12 خانة على الأقل"></div>
    <button class="add secondaryAdd" type="button" onclick="changeAccountPassword()">تغيير كلمة المرور</button>
    <h3>❤️ المفضلة (${fav.length})</h3><div class="favoritesRow">${fav.length?favoriteCards():'<div class="empty">لم تضيفي منتجات للمفضلة بعد.</div>'}</div>
    <h3>🛍️ السلة الحالية: ${cart.length} أصناف</h3><button class="add" onclick="closeAccount();openCart()">فتح السلة</button>
    <h3 style="margin-top:16px">🔔 سجل التوفر</h3><div id="accountWaitlistHistory" class="waitlistHistoryList"><div class="empty">جاري تحميل سجل التوفر…</div></div>
    <h3 style="margin-top:16px">📋 مشترياتي السابقة</h3><div class="ordersList">${orders.length?orders.map(o=>`<div class="orderSummaryCard"><div><b>#${o.id}</b><br><small>${esc(o.date||'')}</small></div><div><b>${Number(o.total||0).toFixed(2)} ₪</b><br><small>${esc(publicOrderStatusLabel(o.status||'pending'))}</small></div><button type="button" onclick="viewOrder(${o.id})">تتبع الطلب</button></div>`).join(''):'<div class="empty">لا توجد طلبات محفوظة لهذا الحساب بعد.</div>'}</div>`;
  if(a.type==='whatsapp'){
    initCountrySelectors();
    const sel=document.getElementById('accountCountryEdit');
    if(sel){sel.value=a.countryIso||'PS';syncCountryDialPreview('accountCountryEdit','accountContactEdit')}
  }
  loadCustomerPasskeyStatus();
  lfLoadMyWaitlist();
}

let accountMode='whatsapp',accountActionMode='login';
function setAccountMode(mode){
  accountMode=mode==='email'?'email':'whatsapp';
  const w=document.getElementById('modeWhats'),e=document.getElementById('modeEmail'),contact=document.getElementById('accountContact'),tools=document.getElementById('accountCountryTools'),note=document.getElementById('accountGpsNote');
  if(w&&e){w.classList.toggle('active',accountMode==='whatsapp');e.classList.toggle('active',accountMode==='email')}
  if(contact){
    contact.type=accountMode==='email'?'email':'tel';
    contact.inputMode=accountMode==='email'?'email':'tel';
    contact.placeholder=accountMode==='email'?'البريد الإلكتروني':'رقم الواتساب بدون مفتاح الدولة';
    contact.autocomplete='username';
  }
  if(tools)tools.style.display=accountMode==='email'?'none':'flex';
  if(note)note.style.display=accountMode==='email'?'none':'block';
}
function setAccountActionMode(mode){
  accountActionMode=mode==='register'?'register':'login';
  const login=document.getElementById('actionLogin'),register=document.getElementById('actionRegister'),fields=document.getElementById('accountRegisterFields'),submit=document.getElementById('accountSubmit'),hint=document.getElementById('accountActionHint'),password=document.getElementById('accountPassword');
  if(login&&register){login.classList.toggle('active',accountActionMode==='login');register.classList.toggle('active',accountActionMode==='register')}
  if(fields)fields.style.display=accountActionMode==='register'?'block':'none';
  if(submit)submit.textContent=accountActionMode==='register'?'إنشاء الحساب':'تسجيل الدخول';
  if(hint)hint.textContent=accountActionMode==='register'?'أنشئي حسابًا اختياريًا لحفظ الطلبات والمفضلة بين الزيارات.':'أدخلي رقم واتساب أو البريد وكلمة المرور لتسجيل الدخول.';
  if(password)password.autocomplete=accountActionMode==='register'?'new-password':'current-password';
}
function greetingForAccount(a){return a?.gender==='male'?'نورتنا':'نورتينا'}
function registerUserRecord(account){let users=load('lf_users',[]);const key=(account.type||'')+':'+String(account.contact||'').trim().toLowerCase();const i=users.findIndex(u=>((u.type||'')+':'+String(u.contact||'').trim().toLowerCase())===key);const rec={...account,id:i>=0?users[i].id:Date.now(),updatedAt:Date.now()};if(i>=0)users[i]=rec;else users.unshift(rec);save('lf_users',users)}
function saveAccount(){alert('جاري تجهيز تسجيل الدخول…')}
function customerAuthContact(){
  const raw=document.getElementById('accountContact')?.value.trim()||'';
  const iso=document.getElementById('accountCountryCode')?.value||'PS';
  return {
    raw,
    iso,
    contact:accountMode==='whatsapp'?normalizePhone(raw,iso):raw.toLowerCase()
  };
}
function showCustomerRecovery(){
  const box=document.getElementById('customerRecoveryBox');
  if(!box)return;
  const info=customerAuthContact();
  box.innerHTML=`<div class="notice" style="margin-top:10px"><b>استرداد كلمة المرور</b><br><span>سيتم إرسال رمز من 6 أرقام إلى وسيلة التواصل الموجودة أعلاه.</span><div class="accountActionRow" style="margin-top:8px"><button type="button" onclick="requestCustomerRecovery()">إرسال رمز الاسترداد</button></div><div id="customerRecoveryConfirm"></div></div>`;
  if(!info.raw){
    const contact=document.getElementById('accountContact');
    if(contact)contact.focus();
  }
}
async function requestCustomerRecovery(){
  const info=customerAuthContact();
  if(!info.raw)return alert('أدخلي رقم واتساب أو البريد أولًا.');
  if(accountMode==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.raw))return alert('أدخلي بريدًا إلكترونيًا صحيحًا');
  if(accountMode==='whatsapp'&&!validMobile(info.raw,info.iso))return alert('أدخلي رقم واتساب صحيحًا مع اختيار الدولة');
  const target=document.getElementById('customerRecoveryConfirm');
  try{
    const d=await lfFetch('/api/auth/password-recovery/request',{method:'POST',body:JSON.stringify({contact:info.contact})});
    if(target)target.innerHTML=`<div class="success" style="margin-top:10px">${esc(d.message||'تم إرسال الرمز')}<input id="customerRecoveryCode" class="field" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="رمز الاسترداد"><input id="customerRecoveryPassword" class="field" type="password" minlength="12" autocomplete="new-password" placeholder="كلمة المرور الجديدة — 12 خانة على الأقل"><button type="button" class="add" onclick="confirmCustomerRecovery()">تأكيد وتغيير كلمة المرور</button></div>`;
  }catch(e){
    alert(e.message||'تعذر إرسال رمز الاسترداد');
  }
}
async function confirmCustomerRecovery(){
  const info=customerAuthContact();
  const code=document.getElementById('customerRecoveryCode')?.value.trim()||'';
  const newPassword=document.getElementById('customerRecoveryPassword')?.value||'';
  if(!/^\d{6}$/.test(code))return alert('أدخلي رمز الاسترداد المكون من 6 أرقام');
  if(newPassword.length<12)return alert('كلمة المرور الجديدة يجب أن تكون 12 خانة على الأقل');
  try{
    const d=await lfFetch('/api/auth/password-recovery/confirm',{method:'POST',body:JSON.stringify({contact:info.contact,code,newPassword})});
    alert(d.message||'تم تغيير كلمة المرور');
    const password=document.getElementById('accountPassword');
    if(password)password.value='';
    const box=document.getElementById('customerRecoveryBox');
    if(box)box.innerHTML='<div class="success">تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.</div>';
    setAccountActionMode('login');
  }catch(e){
    alert(e.message||'تعذر تغيير كلمة المرور');
  }
}

async function loadCustomerPasskeyStatus(){
  const el=document.getElementById('customerPasskeyStatus');
  if(!el||!lfToken())return;
  if(!window.LFPasskeys?.supported()){
    el.textContent='البصمة غير مدعومة على هذا الجهاز أو المتصفح. يمكنك الاستمرار بكلمة المرور.';
    return;
  }
  try{
    const d=await lfFetch('/api/passkeys/status');
    const list=d.credentials||[];
    el.innerHTML=list.length
      ? 'البصمة مفعلة على '+list.length+' جهاز/مفتاح.'+list.map(x=>`<div class="toolbar"><span>${esc(x.label||'هذا الجهاز')}</span><button type="button" onclick="removeCustomerPasskey('${esc(x.id)}')">حذف</button></div>`).join('')
      : 'لم يتم تفعيل بصمة دخول للحساب بعد.';
  }catch(e){el.textContent=e.message||'تعذر تحميل حالة البصمة'}
}
async function enableCustomerPasskey(){
  if(!window.LFPasskeys?.supported())return alert('هذا الجهاز أو المتصفح لا يدعم تسجيل الدخول بالبصمة.');
  if(!lfToken())return alert('سجلي الدخول بكلمة المرور أولًا.');
  try{
    const options=await lfFetch('/api/passkeys/register/options',{method:'POST',body:'{}'});
    const credential=await window.LFPasskeys.createCredential(options);
    await lfFetch('/api/passkeys/register/verify',{method:'POST',body:JSON.stringify({challengeId:options.challengeId,credential,label:'جهاز العميل'})});
    alert('تم تفعيل الدخول بالبصمة على هذا الجهاز 🌸');
    await loadCustomerPasskeyStatus();
  }catch(e){
    if(e?.name==='NotAllowedError')return alert('تم إلغاء طلب البصمة أو انتهت المهلة.');
    alert(e.message||'تعذر تفعيل البصمة');
  }
}
async function removeCustomerPasskey(id){
  if(!confirm('حذف هذه البصمة من الحساب؟'))return;
  try{
    await lfFetch('/api/passkeys/'+encodeURIComponent(id),{method:'DELETE'});
    await loadCustomerPasskeyStatus();
  }catch(e){alert(e.message||'تعذر حذف البصمة')}
}
async function customerPasskeyLogin(){
  if(!window.LFPasskeys?.supported())return alert('هذا الجهاز أو المتصفح لا يدعم تسجيل الدخول بالبصمة.');
  const info=customerAuthContact();
  if(!info.raw)return alert('أدخلي رقم واتساب أو البريد أولًا.');
  if(accountMode==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.raw))return alert('أدخلي بريدًا إلكترونيًا صحيحًا');
  if(accountMode==='whatsapp'&&!validMobile(info.raw,info.iso))return alert('أدخلي رقم واتساب صحيحًا مع اختيار الدولة');
  try{
    const options=await lfFetch('/api/passkeys/login/options',{method:'POST',body:JSON.stringify({contact:info.contact})});
    const credential=await window.LFPasskeys.getCredential(options);
    const result=await lfFetch('/api/passkeys/login/verify',{method:'POST',body:JSON.stringify({challengeId:options.challengeId,credential})});
    localStorage.setItem(LF_TOKEN_KEY,result.token);
    const user=result.user||{};
    const safe={
      ...user,
      serverUserId:user?.id??user?.user_id??null,
      contact:accountMode==='email'?(user.email||info.contact):(user.phone||info.contact),
      type:accountMode,
      countryIso:accountMode==='whatsapp'?info.iso:'',
      countryName:accountMode==='whatsapp'?countryName(info.iso):'',
      updatedAt:Date.now()
    };
    save(ACCOUNT_KEY,safe);
    registerUserRecord(safe);
    await lfSyncMyOrders();
    await lfLoadLoyalty();
    await lfSyncAccountState();
    renderAccountContent();
    updateAccountBadge();
    alert('تم تسجيل الدخول بالبصمة 🌸');
  }catch(e){
    if(e?.name==='NotAllowedError')return alert('تم إلغاء طلب البصمة أو لم يتم التعرف عليها.');
    alert(e.message||'تعذر تسجيل الدخول بالبصمة');
  }
}

async function changeAccountPassword(){
  const currentPassword=document.getElementById('accountCurrentPassword')?.value||'',newPassword=document.getElementById('accountNewPassword')?.value||'';
  if(!currentPassword)return alert('أدخلي كلمة المرور الحالية');
  if(newPassword.length<12)return alert('كلمة المرور الجديدة يجب أن تكون 12 خانة على الأقل');
  try{
    await lfFetch('/api/auth/password',{method:'PATCH',body:JSON.stringify({currentPassword,newPassword})});
    const current=document.getElementById('accountCurrentPassword'),next=document.getElementById('accountNewPassword');
    if(current)current.value='';if(next)next.value='';
    alert('تم تغيير كلمة المرور بنجاح 🌸');
  }catch(e){alert(e.message||'تعذر تغيير كلمة المرور')}
}
function logoutAccount(){localStorage.removeItem(ACCOUNT_KEY);renderAccountContent();updateAccountBadge()}


function updateAccountBadge(){const a=getAccount(),b=document.getElementById('accountBtn');if(b){b.innerHTML=a?'👤<i class="accountBadge">✓</i>':'👤';b.title=a?`${greetingForAccount(a)}، ${a.name||'سيدتي'} 🩷`:'حسابي';b.setAttribute('aria-label',b.title)}}
function quickOffers(){const now=Date.now();return products.filter(p=>p.quickOffer&&(!p.quickOfferExpiry||new Date(p.quickOfferExpiry+'T23:59:59').getTime()>=now)&&totalStock(p)>0).slice(0,8)}
function shareOfferWhatsApp(id){const p=products.find(x=>x.id===id);if(!p)return;const name=currentLang==='en'?(p.en||p.name):p.name,url=location.href.split('#')[0]+'#product-'+p.id,msg=`⚡ عرض سريع من Ladies First\n${name}\nالسعر: ${Number(p.price)||0} ₪${p.old&&p.old>p.price?` بدل ${Number(p.old)} ₪`:''}\nللطلب: ${url}`;window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank')}
function renderQuickOffers(){const el=document.getElementById('quickOfferGrid');if(!el)return;const list=quickOffers();el.innerHTML=list.length?list.map(p=>{const img=safeImg(mainImagesOf(p)[0],LOGO),vs=variantList(p),available=vs.filter(v=>Number(v.stock)>0);const selector=vs.length?`<select id="quickVariant-${p.id}" class="quickOfferVariant" onclick="event.stopPropagation()" aria-label="${currentLang==='en'?'Choose color or option':'اختاري اللون أو الخيار'}"><option value="">${currentLang==='en'?'Choose color/option':'اختاري اللون/الخيار'}</option>${vs.map(v=>`<option value="${esc(v.name)}" ${Number(v.stock)<=0?'disabled':''}>${esc(v.name)}${Number(v.stock)<=0?(currentLang==='en'?' — Sold out':' — خلص'):''}</option>`).join('')}</select>`:'';const buyArg=vs.length?`document.getElementById('quickVariant-${p.id}')?.value||''`:"''";return `<article class="quickOfferCard"><img src="${img}" onclick="openProduct(${p.id})"><div class="quickOfferBody"><b>${esc(currentLang==='en'?(p.en||p.name):p.name)}</b><div class="fprice">${Number(p.price)||0} ₪</div>${selector}<div class="quickOfferActions"><button class="quickOfferBuy" onclick="event.stopPropagation();quickBuy(${p.id},${buyArg})" ${vs.length&&!available.length?'disabled':''}>🛍️ شراء</button><button class="quickOfferWA" onclick="shareOfferWhatsApp(${p.id})"><svg class="waIcon" viewBox="0 0 448 512" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg> واتساب</button></div></div></article>`}).join(''):'<div class="empty">لا توجد عروض سريعة حاليًا.</div>'}
function featureCardHtml(p,extra=''){const img=safeImg(mainImagesOf(p)[0],LOGO);return `<article class="featureCard" onclick="openProduct(${p.id})"><img src="${img}" onerror="this.onerror=null;this.src='${LOGO}'"><div class="fcbody"><b>${esc(currentLang==='en'?(p.en||p.name):p.name)}</b><div class="fprice">${Number(p.price)||0} ₪</div>${extra}</div></article>`}
let featureTimer=null;
const featureTouchState={};
const featureDragState={};
function featureMotionSettings(id){return load('lf_feature_carousels',{})[id==='top5Grid'?'top5':'bestSellers']||{intervalSeconds:3.5,transition:'smooth'}}
function bindFeatureCarousel(el){if(!el||el.dataset.carouselBound==='1')return;el.dataset.carouselBound='1';el.style.touchAction='auto';window.LFCarouselMotion?.bind(el)}
function moveFeatureCarousel(id,dir){const el=document.getElementById(id);if(!el)return;window.LFCarouselMotion?.move(el,dir,featureMotionSettings(id));}
function initFeatureCarousels(){bindFeatureCarousel(document.getElementById('top5Grid'));bindFeatureCarousel(document.getElementById('bestSellersGrid'));}
function autoFeatureCarousels(){if(document.hidden)return;['top5Grid','bestSellersGrid'].forEach(id=>window.LFCarouselMotion?.tick(document.getElementById(id),featureMotionSettings(id)))}
let featureAutoTimer=null;let featureAutoPausedUntil=0;
function restartFeatureAuto(){clearInterval(featureAutoTimer);featureAutoTimer=setInterval(autoFeatureCarousels,250);}

function renderFeatureSections(){
  const t=document.getElementById('top5Grid'),b=document.getElementById('bestSellersGrid');
  if(!t||!b)return;
  const top=getTop5(),best=getBestSellers();
  t.innerHTML=top.length?top.map(p=>featureCardHtml(p)).join(''):'<div class="empty">لا توجد عروض حالياً</div>';
  b.innerHTML=best.length?best.map(x=>featureCardHtml(x.p)).join(''):`<div class="empty">${bestSellersEmptyMessage()}</div>`;
  t.scrollLeft=0;b.scrollLeft=0;
  initFeatureCarousels();
  restartFeatureAuto();
  renderQuickOffers();
}
function clearSearchAutofill(el){if(!el)return;const value=String(el.value||'').trim();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)){el.value='';if(typeof products!=='undefined')renderProducts()}}function handleStoreSearchInput(el){clearSearchAutofill(el);renderProducts();queueSearchHistory(el.value)}function renderProducts(){const searchInput=document.getElementById('search');if(searchInput&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(searchInput.value||'').trim()))searchInput.value='';const q=(searchInput?.value||'').toLowerCase(),f=document.getElementById('filter').value,bf=document.getElementById('brandFilter')?.value||'';const list=products.filter(p=>(!f||p.cat===f)&&(!bf||p.brand===bf)&&(!q||(`${p.name||''} ${p.en||''} ${p.desc||''} ${p.brand||''}`).toLowerCase().includes(q)));document.getElementById('grid').innerHTML=list.map(p=>{const img=safeImg(mainImagesOf(p)[0],LOGO);const vs=variantList(p);const stock=totalStock(p);const sold=stock<=0;const defaultVariant=vs.find(v=>v.stock>0)?.name||'';const inCart=(findCartItem(p.id,defaultVariant)?.qty)||0;return `<article class="card ${sold?'soldOutCard':''}"><div class="pic" onclick="openProduct(${p.id})"><button class="favBtn ${isFavorite(p.id)?'active':''}" type="button" onclick="event.stopPropagation();toggleFavorite(${p.id})">${isFavorite(p.id)?'♥':'♡'}</button><img src="${img}" onerror="this.onerror=null;this.src='${LOGO}'">${p.onSale&&p.old>p.price?`<span class="discount">-${Math.round((1-p.price/p.old)*100)}%</span>`:''}${sold?`<div class="soldStamp">💕<span>عذرًا سيدتي،<br>خلصت الكمية🌸</span></div>`:''}</div><div class="body"><h3>${esc(currentLang==='en'?(p.en||p.name):p.name)}</h3><p>${esc(p.desc||'')}</p><div class="priceLine"><span class="price">${Number(p.price)||0} ₪</span>${p.onSale&&p.old>p.price?`<span class="old">${Number(p.old)} ₪</span>`:''}${p.onSale&&Number(p.old)>Number(p.price)?`<span class="offerText">لأجلك سيدتي</span>`:''}${Number(storeCommerceSettings.visaDiscountPercent)>0?`<span class="visaOffer">💳 خصم Visa ${Number(storeCommerceSettings.visaDiscountPercent)}%</span>`:''}</div>${sold?`<div class="soldText">${outOfStockMessage()}</div><button class="waitBtn" onclick="joinWaitlist(${p.id})">${currentLang==='en'?'🔔 Join availability list':'🔔 سجّلي في قائمة التوفر'}</button><button class="similarBtn" onclick="showSimilar(${jsAttr(p.cat)},${p.id})">${currentLang==='en'?'🌸 See similar items':'🌸 شوفي أشياء بتشبهها'}</button>`:vs.length?`<button class="add" onclick="openProduct(${p.id})">${currentLang==='en'?'Choose options':'اختاري اللون / الخيار'}</button>`:`<button class="add" onclick="addSingleToCart(${p.id},'')">${currentLang==='en'?'Add to cart':'أضيفي للسلة'}</button><div class="quantityBar"><button onclick="changeProductQty(${p.id},-1,'')">−</button><span class="num" id="qtyNum_${p.id}">${inCart}</span><button onclick="changeProductQty(${p.id},1,'')">+</button></div>`}</div></article>`}).join('')||'<div class="empty">لا توجد منتجات</div>';updateCount()}
function showSimilar(cat,id){document.getElementById('filter').value=cat;document.getElementById('search').value='';document.getElementById('products').scrollIntoView({behavior:'smooth'});const all=products.filter(p=>p.cat===cat&&p.id!==id);document.getElementById('grid').innerHTML=all.length?'':`<div class="empty">لا توجد أصناف مشابهة حاليًا.</div>`;if(all.length)renderProducts()}
function completeLookProducts(p){
  if(!p)return [];
  const available=products.filter(x=>x&&String(x.id)!==String(p.id)&&totalStock(x)>0);
  const manual=Array.isArray(p.completeLookIds)?p.completeLookIds.map(String).filter(Boolean):[];
  if(manual.length){
    return manual.map(id=>available.find(x=>String(x.id)===id)).filter(Boolean).slice(0,5);
  }
  const different=available.filter(x=>x.cat!==p.cat);
  const sameBrand=different.filter(x=>p.brand&&x.brand===p.brand);
  const pool=[...sameBrand,...different.filter(x=>!sameBrand.includes(x))];
  return pool.slice(0,3);
}
function completeLookHtml(p){
  const picks=completeLookProducts(p);
  if(!picks.length)return '';
  return `<div class="completeLookBox"><h3>✨ ${currentLang==='en'?'Complete the look':'كمّلي الإطلالة'}</h3><div class="completeLookGrid">${picks.map(x=>`<button type="button" class="completeLookItem" onclick="addSingleToCart(${JSON.stringify(x.id)},'');this.classList.add('added');this.querySelector('span').textContent='${currentLang==='en'?'Added ✓':'تمت الإضافة ✓'}'"><img src="${safeImg(mainImagesOf(x)[0],LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"><b>${esc(currentLang==='en'?(x.en||x.name):x.name)}</b><small>${Number(x.price)||0} ₪</small><span>${currentLang==='en'?'Add':'أضيفي للسلة'}</span></button>`).join('')}</div></div>`;
}
function productVideoHtml(p){
  const videos=Array.isArray(p?.videos)?p.videos.filter(Boolean).slice(0,8):[];
  if(!videos.length)return '';
  const cards=videos.map(raw=>{
    const value=String(raw||'').trim();
    try{
      const u=new URL(value,location.origin);
      if(!['http:','https:'].includes(u.protocol))return '';
      const host=u.hostname.toLowerCase();
      let youtubeId='';
      if(host==='youtu.be')youtubeId=u.pathname.split('/').filter(Boolean)[0]||'';
      if(host.endsWith('youtube.com')){
        if(u.pathname==='/watch')youtubeId=u.searchParams.get('v')||'';
        else if(u.pathname.startsWith('/embed/'))youtubeId=u.pathname.split('/')[2]||'';
        else if(u.pathname.startsWith('/shorts/'))youtubeId=u.pathname.split('/')[2]||'';
      }
      if(youtubeId&&/^[A-Za-z0-9_-]{6,20}$/.test(youtubeId)){
        const src='https://www.youtube.com/embed/'+youtubeId;
        return `<div class="productVideo"><iframe src="${esc(src)}" title="فيديو المنتج" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
      }
      if((u.origin===location.origin&&u.pathname.startsWith('/api/videos/'))||/\.(mp4|webm|ogg|mov)(?:$|\?)/i.test(u.href)){
        return `<div class="productVideo"><video controls preload="metadata" playsinline src="${esc(u.href)}"></video></div>`;
      }
      return `<a class="productVideoLink" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">▶ مشاهدة فيديو المنتج</a>`;
    }catch{return ''}
  }).filter(Boolean).join('');
  return cards?`<div class="productVideos"><h3>${currentLang==='en'?'Product videos':'فيديوهات المنتج'}</h3>${cards}</div>`:'';
}
function openProduct(id){const productHash='#product-'+id;if(location.hash!==productHash){history.pushState({productId:Number(id)},'',productHash);}const p=products.find(x=>x.id===id);if(!p)return;const mains=mainImagesOf(p),subs=subImagesOf(p),imgs=[...mains,...subs],vs=variantList(p),sold=totalStock(p)<=0;document.getElementById('modalBody').innerHTML=`<div class="modalGrid"><div><img id="mainProductImg" class="mainImg" src="${safeImg(imgs[0],LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"><div class="thumbs">${imgs.map((x,i)=>`<img class="${i===0?'active':''}" src="${safeImg(x)}" onerror="this.style.display='none'" onclick="pickImg(this,${jsAttr(x)})">`).join('')}</div></div><div><h1>${esc(currentLang==='en'?(p.en||p.name):p.name)}</h1><p>${esc(p.desc||'')}</p>${productVideoHtml(p)}<div class="priceLine"><h2 class="price">${Number(p.price)||0} ₪</h2>${p.onSale&&p.old>p.price?`<span class="old">${Number(p.old)} ₪</span>`:''}${p.onSale&&Number(p.old)>Number(p.price)?`<span class="offerText">لأجلك سيدتي</span>`:''}${Number(storeCommerceSettings.visaDiscountPercent)>0?`<span class="visaOffer">💳 خصم Visa ${Number(storeCommerceSettings.visaDiscountPercent)}%</span>`:''}</div>${vs.length?renderVariantChooser(p):''}${renderPackagingOptions()}${completeLookHtml(p)}${sold?`<div class="soldText">${outOfStockMessage()}</div><button class="waitBtn" onclick="joinWaitlist(${p.id})">${currentLang==='en'?'🔔 Join availability list':'🔔 سجّلي في قائمة التوفر'}</button>`:`<button class="add" onclick="addSingleToCart(${p.id},selectedVariant(${p.id}),selectedPackaging());closeModal()">${currentLang==='en'?'Add to cart':'أضيفي للسلة'}</button>`}</div></div>`;document.getElementById('modal').style.display='flex'}
function pickImg(el,src){document.getElementById('mainProductImg').src=src;document.querySelectorAll('.thumbs img').forEach(x=>x.classList.remove('active'));el.classList.add('active')}function closeModal(){if(location.hash.indexOf('#product-')===0){history.replaceState(null,'',location.pathname+location.search);} document.getElementById('modal').style.display='none'}
const DEFAULT_PACKAGING_OPTIONS=[{id:'clear-ribbon',nameAr:'تغليف شفاف مع شبرة',nameEn:'Clear wrapping with ribbon',price:5,active:true},{id:'paper-ribbon',nameAr:'تغليف ورقي مع شبرة',nameEn:'Paper wrapping with ribbon',price:15,active:true}];
function getPackagingOptions(){let a=load('lf_packaging_options',null);if(!Array.isArray(a)||!a.length){a=DEFAULT_PACKAGING_OPTIONS.map(x=>({...x}));save('lf_packaging_options',a)}return a.filter(x=>x&&x.active!==false)}
function getPackaging(id){return getPackagingOptions().find(x=>x.id===id)||null}
function renderPackagingOptions(){const opts=getPackagingOptions();if(!opts.length)return '';return `<div class="packagingBox"><div class="packagingTitle">🎁 ${currentLang==='en'?'Would you like gift wrapping?':'هل ترغبين بطلب تغليف للمنتج؟'}</div><div class="packagingHint">${currentLang==='en'?'Choose wrapping before adding the product to your cart.':'اختاري نوع التغليف قبل إضافة المنتج إلى السلة.'}</div><label class="packagingOption"><input type="radio" name="packagingChoice" value="" checked><span class="pkgText">${currentLang==='en'?'No wrapping':'بدون تغليف'}</span><span class="pkgPrice">0 ₪</span></label>${opts.map(x=>`<label class="packagingOption"><input type="radio" name="packagingChoice" value="${esc(x.id)}"><span class="pkgText">${esc(currentLang==='en'?(x.nameEn||x.nameAr):(x.nameAr||x.nameEn))}</span><span class="pkgPrice">${Number(x.price)||0} ₪</span></label>`).join('')}</div>`}
function selectedPackaging(){return document.querySelector('input[name="packagingChoice"]:checked')?.value||''}
function findCartItem(id,variant,packagingId=''){return cart.find(i=>i.id===id&&(i.variant||'')===(variant||'')&&(i.packagingId||'')===(packagingId||''))}
function variantStock(p,variant){const vs=variantList(p);if(!vs.length)return Math.max(0,Number(p.stock)||0);const v=vs.find(x=>x.name===variant);return v?Math.max(0,v.stock):0}
function outOfStockMessage(){return currentLang==='en'?'💕 Sorry, this item is out of stock 🌸':'💕 عذرًا سيدتي، خلصت الكمية🌸'}
function insufficientStockMessage(stock){const available=Math.max(0,Number(stock)||0);return currentLang==='en'?'Only '+available+' pieces are currently available. You can add up to '+available+'.':'💕 عذرًا سيدتي، المتوفر حاليًا '+available+' قطع … يمكنك إضافة عدد القطع المتاحة '+available+' قطع كحد أقصى.'}
function lowStockMessage(stock){const available=Math.max(0,Number(stock)||0);return currentLang==='en'?'Only '+available+' pieces left':'استغلي الفرصة لآخر '+available+' قطع'}
function addToCart(id,qty=1,variant='',packagingId=''){const p=products.find(x=>x.id===id);if(!p)return;const vs=variantList(p);if(vs.length&&!variant){variant=vs.find(v=>v.stock>0)?.name||''}const stock=variantStock(p,variant);if(stock<=0)return alert(outOfStockMessage());let x=findCartItem(id,variant,packagingId);const current=x?Number(x.qty)||0:0;const next=current+Math.max(1,qty);if(next>stock)return alert(insufficientStockMessage(stock));if(x)x.qty=next;else cart.push({id,qty:Math.max(1,qty),variant,packagingId:packagingId||''});save('lf_cart',cart);renderProducts();renderCart();lfCartHeartbeat()}

// زر "أضيفي للسلة" ينقل قطعة واحدة فقط. تكرار الضغط لا يزيد الكمية؛ الزيادة تتم حصراً من زر +.
function showCartNotice(msg){let el=document.getElementById('cartNoticeToast');if(!el){el=document.createElement('div');el.id='cartNoticeToast';el.style.cssText='position:fixed;right:50%;transform:translateX(50%);bottom:90px;z-index:9999;background:#63345e;color:#fff;padding:13px 18px;border-radius:16px;box-shadow:0 8px 24px #0003;font-weight:700;text-align:center;max-width:90%;transition:opacity .2s';document.body.appendChild(el)}el.textContent=msg;el.style.opacity='1';clearTimeout(el._timer);el._timer=setTimeout(()=>{el.style.opacity='0'},2600)}
function addSingleToCart(id,variant='',packagingId=''){const p=products.find(x=>x.id===id);if(!p)return;const vs=variantList(p);if(vs.length&&!variant){variant=vs.find(v=>v.stock>0)?.name||''}const stock=variantStock(p,variant);if(stock<=0)return alert(outOfStockMessage());const existing=findCartItem(id,variant,packagingId);if(existing){renderProducts();renderCart();return}cart.push({id,qty:1,variant,packagingId:packagingId||''});save('lf_cart',cart);clearCheckoutDraft();renderProducts();renderCart();lfCartHeartbeat()}
function quickBuy(id,variant='',packagingId=''){const p=products.find(x=>x.id===id);if(!p)return;const vs=variantList(p);if(vs.length&&!variant)return alert(currentLang==='en'?'Please choose a color/option first.':'سيدتي، اختاري اللون/الخيار أولًا 🌸');const stock=variantStock(p,variant);if(stock<=0)return alert(outOfStockMessage());const existing=findCartItem(id,variant,packagingId);if(existing){showCartNotice('سيدتي، هاد الصنف موجود أصلًا بسلتك 🩷');return}cart.push({id,qty:1,variant,packagingId:packagingId||''});save('lf_cart',cart);clearCheckoutDraft();renderProducts();openCart();lfCartHeartbeat();setTimeout(()=>openCheckoutForm(),100)}
function changeProductQty(id,d,variant='',packagingId=''){const p=products.find(x=>x.id===id);if(!p)return;const vs=variantList(p);if(vs.length&&!variant)variant=vs.find(v=>v.stock>0)?.name||'';let x=findCartItem(id,variant,packagingId);if(!x&&d>0){addToCart(id,1,variant,packagingId);return}if(!x)return;const stock=variantStock(p,variant),next=(Number(x.qty)||0)+d;if(next>stock)return alert(insufficientStockMessage(stock));x.qty=next;if(x.qty<=0)cart=cart.filter(i=>!(i.id===id&&(i.variant||'')===(variant||'')&&(i.packagingId||'')===(packagingId||'')));save('lf_cart',cart);renderProducts();renderCart();lfCartHeartbeat()}
async function openCart(){document.getElementById('drawer').style.display='block';if(lfToken())await lfLoadLoyalty();if(couponCode&&!activeCoupon)await restoreCouponFromServer();renderCart()}function closeCart(){document.getElementById('drawer').style.display='none'}
function updateCartPackaging(id,variant,packagingId,oldPackagingId=''){const x=findCartItem(id,variant||'',oldPackagingId||'');if(!x)return;x.packagingId=packagingId||'';save('lf_cart',cart);renderCart();updateCount()}
function changeCartQty(id,d,variant,packagingId){changeProductQty(id,d,variant,packagingId||'')}
function updateCount(){document.getElementById('count').textContent=cart.reduce((a,b)=>a+(Number(b.qty)||0),0)}
let couponCode=localStorage.getItem('lf_coupon')||'';
let activeCoupon=null;
function cartMerchandiseSubtotal(){let subtotal=0;cart.forEach(i=>{const p=products.find(x=>x.id===i.id);if(!p)return;subtotal+=(Number(p.price)||0)*Math.max(1,Number(i.qty)||1)});return subtotal}
function couponForCode(code,subtotal){const normalized=String(code||'').trim().toUpperCase();if(!normalized||!activeCoupon||String(activeCoupon.code||'').toUpperCase()!==normalized)return null;const minimum=Math.max(0,Number(activeCoupon.minimumAmount||0)||0);if(Number(subtotal||0)<minimum)return null;const maxUses=Math.max(0,Number(activeCoupon.maxUses||0)||0),usedCount=Math.max(0,Number(activeCoupon.usedCount||0)||0);if(maxUses>0&&usedCount>=maxUses)return null;if(activeCoupon.expiresAt&&Date.parse(activeCoupon.expiresAt)<Date.now())return null;return activeCoupon}
async function validateCouponFromServer(code,subtotal=cartMerchandiseSubtotal()){const normalized=String(code||'').trim().toUpperCase();const phoneEl=document.getElementById('phone');const countryIso=document.getElementById('checkoutCountryCode')?.value||'PS';const customerPhone=phoneEl?.value?normalizePhone(phoneEl.value,countryIso):'';const d=await lfFetch('/api/coupons/validate',{method:'POST',body:JSON.stringify({code:normalized,subtotal,customerPhone})});const x=d.coupon||{};return {code:String(x.code||normalized).toUpperCase(),type:String(x.discountType||x.discount_type||'percent').toLowerCase(),value:Number(x.discountValue??x.discount_value??0)||0,minimumAmount:Number(x.minimumAmount??x.minimum_amount??0)||0,maxUses:Number(x.maxUses??x.max_uses??0)||0,usedCount:Number(x.usedCount??x.used_count??0)||0,maxUsesPerCustomer:Number(x.maxUsesPerCustomer??x.max_uses_per_customer??0)||0,startsAt:x.startsAt||x.starts_at||null,expiresAt:x.expiresAt||x.expires_at||null}}
async function restoreCouponFromServer(){if(!couponCode){activeCoupon=null;return}try{activeCoupon=await validateCouponFromServer(couponCode)}catch(e){activeCoupon=null;couponCode='';localStorage.removeItem('lf_coupon')}}
let lfLoyalty={points:0,settings:{enabled:false,redeemEnabled:true,pointValue:0.1}};
async function lfLoadLoyalty(){if(!lfToken())return;try{const d=await lfFetch('/api/loyalty');lfLoyalty=d;const a=load(ACCOUNT_KEY,null)||{};a.points=Number(d.points||0);save(ACCOUNT_KEY,a);updateCheckoutTotal()}catch(e){console.warn('API loyalty unavailable',e.message)}}
function getPointsRedeem(){const e=document.getElementById('pointsRedeem');return Math.max(0,Math.floor(Number(e?.value)||0))}
function calculateDiscountBreakdown(subtotal,pay,coupon,visaPercent){
  const merchandise=Math.max(0,Number(subtotal)||0);
  let couponDiscount=0;
  if(coupon){
    const type=String(coupon.type||coupon.discount_type||'percent').toLowerCase();
    const value=Math.max(0,Number(coupon.value??coupon.discount_value??0)||0);
    couponDiscount=type==='fixed'
      ?Math.min(merchandise,value)
      :Math.min(merchandise,merchandise*(Math.min(100,value)/100));
  }
  const afterCoupon=Math.max(0,merchandise-couponDiscount);
  const visaRate=pay==='visa'?Math.min(100,Math.max(0,Number(visaPercent)||0)):0;
  const visaDiscount=afterCoupon*(visaRate/100);
  return {couponDiscount,visaDiscount,afterDiscounts:Math.max(0,afterCoupon-visaDiscount)};
}
function getCartTotals(pay,code=couponCode){
  let subtotal=0,packagingTotal=0;
  cart.forEach(i=>{
    const p=products.find(x=>x.id===i.id);
    if(!p)return;
    const qty=Math.max(1,Number(i.qty)||1),line=(Number(p.price)||0)*qty;
    subtotal+=line;
    const pkg=getPackaging(i.packagingId);
    if(pkg)packagingTotal+=(Number(pkg.price)||0)*qty;
  });
  const coupon=couponForCode(code,subtotal);
  const discounts=calculateDiscountBreakdown(
    subtotal,
    pay,
    coupon,
    storeCommerceSettings.visaDiscountPercent
  );
  const ship=currentShipping();
  const shippingFee=ship.fee;
  const redeemEnabled=!!lfLoyalty?.settings?.enabled&&lfLoyalty?.settings?.redeemEnabled!==false;
  const pv=Math.max(0,Number(lfLoyalty?.settings?.pointValue||0));
  const requested=getPointsRedeem();
  const balance=Math.max(0,Number(lfLoyalty?.points||0));
  const pointsRedeemed=redeemEnabled?Math.min(requested,balance):0;
  const loyaltyDiscount=Math.min(
    pointsRedeemed*pv,
    discounts.afterDiscounts
  );
  return {
    subtotal,
    visaDiscount:discounts.visaDiscount,
    couponDiscount:discounts.couponDiscount,
    packagingTotal,
    shippingFee,
    pointsRedeemed,
    loyaltyDiscount,
    total:Math.max(0,discounts.afterDiscounts-loyaltyDiscount)+packagingTotal+shippingFee,
    coupon,
    shippingRegion:document.getElementById('shippingRegion')?.value||'westbank',
    shippingRegionName:currentLang==='en'?ship.en:ship.ar
  };
}
async function applyCoupon(){const input=document.getElementById('couponInput');const code=String(input?.value||'').trim().toUpperCase();if(!code)return alert(currentLang==='en'?'Enter a coupon code':'اكتبي كود الخصم');try{activeCoupon=await validateCouponFromServer(code);couponCode=activeCoupon.code;localStorage.setItem('lf_coupon',couponCode);const pay=document.querySelector('input[name="pay"]:checked')?.value||'cod';const totals=getCartTotals(pay);renderCart();alert(currentLang==='en'?('Coupon applied. Discount: '+totals.couponDiscount.toFixed(2)+' ₪'):('تم تطبيق كود الخصم — الخصم '+totals.couponDiscount.toFixed(2)+' ₪'))}catch(e){activeCoupon=null;couponCode='';localStorage.removeItem('lf_coupon');renderCart();alert(e.message||(currentLang==='en'?'Invalid or expired coupon':'كود الخصم غير صحيح أو غير فعال'))}}
function clearCoupon(){couponCode='';activeCoupon=null;localStorage.removeItem('lf_coupon');renderCart()}
function updateCheckoutTotal(){const pay=document.querySelector('input[name="pay"]:checked')?.value||'cod';const t=getCartTotals(pay);const el=document.getElementById('checkoutTotal');if(el)el.textContent=`${currentLang==='en'?'Total:':'الإجمالي:'} ${t.total.toFixed(2)} ₪`;const sh=document.getElementById('shippingLine');if(sh)sh.textContent=`${currentLang==='en'?'Delivery:':'التوصيل:'} ${t.shippingRegionName} — ${t.shippingFee.toFixed(2)} ₪`;const pkg=document.getElementById('packagingTotalLine');if(pkg)pkg.textContent=t.packagingTotal>0?`🎁 ${currentLang==='en'?'Wrapping:':'التغليف:'} +${t.packagingTotal.toFixed(2)} ₪`:'';const vd=document.getElementById('visaDiscountLine');if(vd)vd.textContent=t.visaDiscount>0?`خصم Visa: -${t.visaDiscount.toFixed(2)} ₪`:'';const cd=document.getElementById('couponDiscountLine');if(cd)cd.textContent=t.couponDiscount>0?`${currentLang==='en'?'Coupon discount:':'خصم الكوبون:'} -${t.couponDiscount.toFixed(2)} ₪`:'';const ld=document.getElementById('loyaltyDiscountLine');if(ld)ld.textContent=t.loyaltyDiscount>0?`⭐ خصم استبدال النقاط: -${t.loyaltyDiscount.toFixed(2)} ₪ (${t.pointsRedeemed} نقطة)`:''}
let currentGiftCard=null;
function loadGiftCardDraft(){try{return JSON.parse(localStorage.getItem('lf_gift_card_draft')||'null')}catch(e){return null}}
function setGiftCardDraft(card){currentGiftCard=card||null;try{if(currentGiftCard)localStorage.setItem('lf_gift_card_draft',JSON.stringify(currentGiftCard));else localStorage.removeItem('lf_gift_card_draft')}catch(e){}renderGiftCardCheckoutSummary()}
function renderGiftCardCheckoutSummary(){const box=document.getElementById('giftCardSummary');if(!box)return;const c=currentGiftCard||loadGiftCardDraft();box.innerHTML=c?'<div class="notice"><b>'+esc(c.title||'بطاقة معايدة')+'</b><br>إلى '+esc(c.recipient||'')+'<br>'+esc(c.message||'')+(c.sender?'<br>من '+esc(c.sender):'')+'</div><button type="button" class="danger" style="margin-top:8px" onclick="setGiftCardDraft(null)">إزالة البطاقة</button>':'<div class="small">اختيار البطاقة اختياري ومرفق بالطلب.</div>'}
let giftCardWindow=null;function openGiftCardModal(){giftCardWindow=window.open('/gift-cards/?mode=checkout&v=20261009-2','_blank');if(!giftCardWindow){alert('اسمحي بفتح التبويب لاختيار بطاقة المعايدة.');return}giftCardWindow.focus()}
function closeGiftCardModal(){const modal=document.getElementById('giftCardCheckoutModal');if(modal)modal.style.display='none';document.body.style.overflow=''}
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==giftCardWindow||!event.data||event.data.type!=='lf-gift-card-selected')return;const g=event.data.giftCard;if(!g||!/^card-(?:0[1-9]|1[0-9]|2[01])\.jpg$/.test(String(g.file||''))||!['birthday','graduation','mother','thanks','surprise','love','anniversary'].includes(g.occasion)||!['f','m'].includes(g.gender)||!String(g.recipient||'').trim()||!String(g.message||'').trim()||String(g.message).trim().split(/\s+/).filter(Boolean).length>12)return;setGiftCardDraft({occasion:g.occasion,occasionLabel:String(g.occasionLabel||''),title:String(g.title||''),file:g.file,gender:g.gender,recipient:String(g.recipient).trim().slice(0,32),sender:String(g.sender||'').trim().slice(0,32),message:String(g.message).trim().slice(0,180)});giftCardWindow=null});
function getCheckoutDraft(){
  const f=document.getElementById('checkoutForm');
  if(!f)return null;
  return {
    open: f.classList.contains('open'),
    name: document.getElementById('name')?.value||'',
    phone: document.getElementById('phone')?.value||'',
    city: document.getElementById('city')?.value||'',
    address: document.getElementById('address')?.value||'',
    notes: document.getElementById('notes')?.value||'',
    shippingRegion: document.getElementById('shippingRegion')?.value||'westbank',
    countryIso: document.getElementById('checkoutCountryCode')?.value||'PS',
    countryExplicit: localStorage.getItem('lf_checkout_country_explicit')==='1',
    pay: document.querySelector('input[name="pay"]:checked')?.value||'cod',
    giftCard: currentGiftCard||loadGiftCardDraft()
  };
}
function saveCheckoutDraft(){
  try{const d=getCheckoutDraft();if(d)localStorage.setItem('lf_checkout_draft',JSON.stringify(d));}catch(e){}
}
function loadCheckoutDraft(){
  try{return JSON.parse(localStorage.getItem('lf_checkout_draft')||'null')}catch(e){return null}
}
function clearCheckoutDraft(){try{localStorage.removeItem('lf_checkout_draft');localStorage.removeItem('lf_checkout_country_explicit')}catch(e){}}
function restoreCheckoutDraft(){
  const d=loadCheckoutDraft();currentGiftCard=d?.giftCard||loadGiftCardDraft();
  if(!d)return;
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v};
  if(document.getElementById('checkoutCountryCode')){const countryIso=d.countryExplicit&&d.countryIso?d.countryIso:'PS';document.getElementById('checkoutCountryCode').value=COUNTRY_DIAL_CODES[countryIso]?countryIso:'PS';document.getElementById('checkoutCountryCode').dispatchEvent(new Event('change',{bubbles:true}))}set('name',d.name);set('phone',d.phone);set('city',d.city);set('address',d.address);set('notes',d.notes);set('shippingRegion',d.shippingRegion||'westbank');
  const pay=document.querySelector(`input[name="pay"][value="${d.pay||'cod'}"]`);if(pay)pay.checked=true;
  if(d.open){const f=document.getElementById('checkoutForm');const gate=document.querySelector('.checkoutGate');if(f){f.classList.add('open');if(gate)gate.style.display='none';}}
  updateCheckoutTotal();
}
function setupFeatureDrag(id){/* v36: native touch scrolling; no pointer hijacking. */}
function setupFeatureDrags(){/* intentionally empty; native carousel handles touch/scroll */}

function renderCart(){saveCheckoutDraft();updateCount();const el=document.getElementById('cart'),checkout=document.getElementById('checkout');if(!cart.length){clearCheckoutDraft();setGiftCardDraft(null);el.innerHTML=`<div class="empty">${currentLang==='en'?'Your cart is empty':'السلة فارغة'}</div>`;checkout.innerHTML='';return}el.innerHTML=cart.map(i=>{const p=products.find(x=>x.id===i.id);if(!p)return '';const qty=Number(i.qty)||1,totalLine=(Number(p.price)||0)*qty;return `<div class="cartrow"><div class="cartpic" onclick="openProduct(${p.id})" style="cursor:pointer"><img src="${safeImg(mainImagesOf(p)[0],LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"></div><div class="info"><b>${esc(currentLang==='en'?(p.en||p.name):p.name)}</b>${i.variant?`<div>${currentLang==='en'?'Color:':'اللون:'} ${esc(i.variant)}</div>`:''}<div class="cartPackaging"><label>🎁 ${currentLang==='en'?'Gift wrapping:':'التغليف:'}</label><select onchange="updateCartPackaging(${p.id},${jsAttr(i.variant||'')},this.value,${jsAttr(i.packagingId||'')})"><option value="" ${!i.packagingId?'selected':''}>${currentLang==='en'?'No wrapping':'بدون تغليف'}</option>${getPackagingOptions().map(x=>`<option value="${esc(x.id)}" ${i.packagingId===x.id?'selected':''}>${esc(currentLang==='en'?(x.nameEn||x.nameAr):(x.nameAr||x.nameEn))} +${Number(x.price)||0} ₪</option>`).join('')}</select></div><div>${Number(p.price)||0} ₪ × ${qty} = ${totalLine} ₪${getPackaging(i.packagingId)?` + ${Number(getPackaging(i.packagingId).price)||0} ₪ ${currentLang==='en'?'wrapping':'تغليف'}`:''}</div>${Number(storeCommerceSettings.visaDiscountPercent)>0?`<div class="visaOffer">💳 ${currentLang==='en'?'Visa discount':'خصم Visa'} ${Number(storeCommerceSettings.visaDiscountPercent)}%</div>`:''}</div><div class="qty"><button onclick="changeCartQty(${p.id},-1,${jsAttr(i.variant||'')},${jsAttr(i.packagingId||'')})">−</button><b>${qty}</b><button onclick="changeCartQty(${p.id},1,${jsAttr(i.variant||'')},${jsAttr(i.packagingId||'')})">+</button></div></div>`}).join('');const t=getCartTotals(document.querySelector('input[name="pay"]:checked')?.value||'cod');checkout.innerHTML=`<div class="checkoutGate"><button class="add" type="button" onclick="openCheckoutForm()">🧾 ${currentLang==='en'?'Complete order / Buyer details':'إتمام الطلب وإدخال بيانات المشتري'}</button></div><div id="checkoutForm" class="checkoutForm"><div class="orderFormTitle">🧾 ${currentLang==='en'?'Complete order & buyer details':'إتمام الطلب وإدخال بيانات المشتري'}</div><div class="checkout"><p id="visaPaymentNotice">${currentLang==='en'?'Visa selection does not charge your card online. We will contact you to arrange payment.':'اختيار Visa لا يخصم المبلغ إلكترونياً؛ سنتواصل معك لترتيب الدفع.'}</p><b id="checkoutTotal"></b><div id="visaDiscountLine" class="visaOffer" style="margin-top:8px"></div><div id="couponDiscountLine" class="couponLine" style="margin-top:8px"></div><div id="loyaltyDiscountLine" class="couponLine" style="margin-top:8px"></div><div class="couponBox"><b>🎟️ ${currentLang==='en'?'Discount code':'كود الخصم'}</b><div class="couponRow"><input id="couponInput" class="field" value="${esc(couponCode)}" placeholder="${currentLang==='en'?'Enter coupon code':'أدخلي كود الخصم'}"><button onclick="applyCoupon()">${currentLang==='en'?'Apply':'تطبيق'}</button>${couponCode?`<button class="danger" onclick="clearCoupon()">×</button>`:''}</div>${t.coupon?`<div class="couponApplied">✓ ${currentLang==='en'?'Applied':'تم تطبيق'}: ${esc(t.coupon.code)}</div>`:''}</div><div id="loyaltyBox" class="couponBox" style="display:${lfLoyalty?.settings?.enabled?'block':'none'}"><b>⭐ استبدال النقاط</b><div class="small">رصيدك: ${Number(lfLoyalty?.points||0)} نقطة — قيمة النقطة: ${Number(lfLoyalty?.settings?.pointValue||0).toFixed(2)} ₪</div><div class="couponRow"><input id="pointsRedeem" class="field" type="number" min="0" max="${Number(lfLoyalty?.points||0)}" step="1" value="0" oninput="updateCheckoutTotal()"><button type="button" onclick="document.getElementById('pointsRedeem').value=${Number(lfLoyalty?.points||0)};updateCheckoutTotal()">استخدام الكل</button></div></div><input class="field" id="name" placeholder="${currentLang==='en'?'Full name':'الاسم الكامل'}"><div class="phoneIntlBox checkoutPhoneBox"><div class="phoneIntlTop"><select id="checkoutCountryCode" class="field countrySelect" onchange="syncCountryDialPreview('checkoutCountryCode','phone')"></select><span class="phoneDialHint" id="phoneDialHint">+970</span></div><input class="field" id="phone" placeholder="${currentLang==='en'?'Mobile number without country code':'رقم الجوال بدون مفتاح الدولة'}" inputmode="tel" autocomplete="tel-national"></div><input class="field" id="city" placeholder="${currentLang==='en'?'City':'المدينة'}"><input class="field" id="address" placeholder="${currentLang==='en'?'Full address':'العنوان بالتفصيل'}"><div class="shippingBox"><b>🚚 ${currentLang==='en'?'Delivery area':'منطقة التوصيل'}</b><select id="shippingRegion" onchange="updateCheckoutTotal()"><option value="westbank">${currentLang==='en'?'West Bank — 20 ₪':'الضفة الغربية — 20 ₪'}</option><option value="jerusalem">${currentLang==='en'?'Jerusalem — 35 ₪':'القدس — 35 ₪'}</option><option value="inside">${currentLang==='en'?'Inside 1948 — 70 ₪':'الداخل — 70 ₪'}</option></select><div id="packagingTotalLine" class="shippingInfo"></div><div id="shippingLine" class="shippingInfo"></div></div><textarea class="field" id="notes" placeholder="${currentLang==='en'?'Notes':'ملاحظات'}"></textarea><div class="couponBox giftCardCheckoutBox"><b>🎁 أضيفي بطاقة هدية أو معايدة</b><div id="giftCardSummary"></div><button type="button" class="add" style="margin-top:9px" onclick="openGiftCardModal()">اختاري البطاقة واكتبي المعايدة</button></div><div class="pay"><label><input type="radio" name="pay" value="cod" checked onchange="updateCheckoutTotal()"> ${currentLang==='en'?'Cash on delivery':'الدفع عند الاستلام'}</label><label><input type="radio" name="pay" value="visa" aria-describedby="visaPaymentNotice" onchange="updateCheckoutTotal()"> 💳 Visa</label></div><button class="add" onclick="placeOrder()">${currentLang==='en'?'Place order':'إنهاء الطلب'}</button></div></div>`;restoreCheckoutDraft();initCountrySelectors();syncCountryDialPreview('checkoutCountryCode','phone');renderGiftCardCheckoutSummary();updateCheckoutTotal()}
function openCheckoutForm(){const f=document.getElementById('checkoutForm');if(f){f.classList.add('open');const gate=document.querySelector('.checkoutGate');if(gate)gate.style.display='none';setTimeout(()=>{const n=document.getElementById('name');if(n)n.focus();f.scrollIntoView({behavior:'smooth',block:'start'});},80);}}

const COUNTRY_DIAL_CODES={"PS":"970","JO":"962","SA":"966","AE":"971","QA":"974","KW":"965","BH":"973","OM":"968","YE":"967","EG":"20","LB":"961","SY":"963","IQ":"964","TR":"90","CY":"357","IL":"972","US":"1","CA":"1","GB":"44","DE":"49","FR":"33","IT":"39","ES":"34","PT":"351","NL":"31","BE":"32","CH":"41","AT":"43","SE":"46","NO":"47","DK":"45","FI":"358","IS":"354","IE":"353","PL":"48","CZ":"420","SK":"421","HU":"36","RO":"40","BG":"359","GR":"30","RU":"7","UA":"380","BY":"375","GE":"995","AM":"374","AZ":"994","KZ":"7","UZ":"998","TM":"993","KG":"996","TJ":"992","CN":"86","JP":"81","KR":"82","IN":"91","PK":"92","BD":"880","LK":"94","NP":"977","AF":"93","IR":"98","ID":"62","MY":"60","SG":"65","TH":"66","VN":"84","PH":"63","KH":"855","LA":"856","MM":"95","MN":"976","AU":"61","NZ":"64","FJ":"679","PG":"675","ZA":"27","NG":"234","KE":"254","TZ":"255","UG":"256","GH":"233","ET":"251","MA":"212","DZ":"213","TN":"216","LY":"218","SD":"249","SS":"211","SO":"252","DJ":"253","ER":"291","SN":"221","GM":"220","GN":"224","SL":"232","LR":"231","CI":"225","BF":"226","ML":"223","NE":"227","TD":"235","CM":"237","CF":"236","GA":"241","CG":"242","CD":"243","GQ":"240","ST":"239","AO":"244","NA":"264","BW":"267","ZM":"260","ZW":"263","MZ":"258","MW":"265","MG":"261","MU":"230","SC":"248","KM":"269","CV":"238","MR":"222","BI":"257","RW":"250","BJ":"229","TG":"228","LS":"266","SZ":"268","AR":"54","BR":"55","CL":"56","PE":"51","CO":"57","VE":"58","EC":"593","BO":"591","PY":"595","UY":"598","GY":"592","SR":"597","GF":"594","FK":"500","MX":"52","GT":"502","BZ":"501","HN":"504","SV":"503","NI":"505","CR":"506","PA":"507","DO":"1","JM":"1","TT":"1","BB":"1","BS":"1","CU":"53","HT":"509","PR":"1","VI":"1","VG":"1","KY":"1","BM":"1","LC":"1","VC":"1","GD":"1","AG":"1","DM":"1","KN":"1","MS":"1","TC":"1","AW":"297","CW":"599","SX":"1721","BQ":"599","GL":"299","FO":"298","GI":"350","MT":"356","LU":"352","MC":"377","SM":"378","VA":"39","AD":"376","LI":"423","BA":"387","RS":"381","ME":"382","XK":"383","MK":"389","SI":"386","HR":"385","AL":"355","EE":"372","LV":"371","LT":"370","MD":"373","JE":"44","GG":"44","IM":"44","AX":"358","IO":"246","CX":"61","CC":"61","NF":"672","TK":"690","TO":"676","WS":"685","VU":"678","SB":"677","KI":"686","NR":"674","TV":"688","NC":"687","PF":"689","WF":"681","GU":"1","MP":"1","AS":"1","FM":"691","MH":"692","PW":"680","CK":"682","NU":"683","AQ":"672","SH":"290","RE":"262","YT":"262","GP":"590","MQ":"596","BL":"590","MF":"590","PM":"508","PN":"64","UM":"1","HK":"852","MO":"853","TW":"886","BN":"673","BT":"975","MV":"960"};
const COUNTRY_NAMES={};
function countryName(iso){try{return new Intl.DisplayNames([currentLang==='en'?'en':'ar'],{type:'region'}).of(iso)||iso}catch(e){return iso}}
function countryOptions(selected='PS'){return Object.keys(COUNTRY_DIAL_CODES).sort((a,b)=>countryName(a).localeCompare(countryName(b),currentLang==='en'?'en':'ar')).map(iso=>`<option value="${iso}" data-dial="+${COUNTRY_DIAL_CODES[iso]}" ${iso===selected?'selected':''}>${countryName(iso)} (+${COUNTRY_DIAL_CODES[iso]})</option>`).join('')}
let activeCountrySelect=null,countrySearchOverlay=null;
const COUNTRY_PICKER_CSS=".country-search-wrap{flex:1 1 180px;min-width:0}.country-native-select{display:none!important}.country-search-trigger{width:100%;min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid #e3d9de;border-radius:10px;background:#fff;color:#3d3038;font:inherit;text-align:right}.country-search-trigger .country-trigger-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.country-search-trigger .country-trigger-arrow{font-size:13px;color:#756670}.country-search-overlay[hidden]{display:none!important}.country-search-overlay{position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:14px;background:#241721bb;backdrop-filter:blur(3px)}.country-search-panel{width:min(100%,480px);max-height:min(86vh,720px);display:flex;flex-direction:column;overflow:hidden;border-radius:18px;background:#fff;box-shadow:0 20px 60px #0004;direction:rtl}.country-search-head{display:flex;align-items:center;justify-content:space-between;padding:15px 17px;border-bottom:1px solid #eee5e9;color:#55263f;font-weight:700}.country-search-close{width:38px;height:38px;border:0;border-radius:50%;background:#f8f1f4;color:#55263f;font-size:22px}.country-search-input{margin:12px 14px;padding:12px 13px;border:1px solid #dfd1d8;border-radius:11px;font:inherit;outline:none}.country-search-input:focus{border-color:#c88f9f;box-shadow:0 0 0 3px #c88f9f25}.country-search-results{overflow:auto;padding:0 10px 12px;overscroll-behavior:contain}.country-search-option{width:100%;display:flex;align-items:center;gap:10px;padding:12px;border:0;border-bottom:1px solid #f0e9ec;background:#fff;color:#30242c;text-align:right;font:inherit}.country-search-option:hover,.country-search-option[aria-selected=true]{background:#fbf3f6}.country-search-check{width:22px;height:22px;display:grid;place-items:center;border:1.5px solid #c9bdc3;border-radius:50%;color:#fff;font-size:13px;flex:0 0 auto}.country-search-option[aria-selected=true] .country-search-check{background:#55263f;border-color:#55263f}.country-search-name{flex:1}.country-search-dial{color:#756670;direction:ltr}.country-search-empty{padding:22px;text-align:center;color:#756670}@media(max-width:600px){.country-search-overlay{padding:10px}.country-search-panel{width:100%;max-height:88dvh;border-radius:16px}.country-search-option{padding:14px 12px}}";
function ensureCountrySearchOverlay(){
 if(countrySearchOverlay)return countrySearchOverlay;
 const style=document.createElement('style');style.textContent=COUNTRY_PICKER_CSS;document.head.appendChild(style);
 const layer=document.createElement('div');layer.className='country-search-overlay';layer.hidden=true;
 layer.innerHTML='<section class="country-search-panel" role="dialog" aria-modal="true" aria-labelledby="countrySearchTitle"><header class="country-search-head"><span id="countrySearchTitle">اختاري الدولة</span><button type="button" class="country-search-close" aria-label="إغلاق">×</button></header><input class="country-search-input" type="search" autocomplete="off" placeholder="ابحثي عن الدولة أو مفتاح الاتصال"><div class="country-search-results" role="listbox"></div></section>';
 document.body.appendChild(layer);countrySearchOverlay=layer;
 const input=layer.querySelector('.country-search-input'),results=layer.querySelector('.country-search-results');
 layer._draw=function(query){
  const q=String(query||'').trim().toLocaleLowerCase(),digits=q.replace(/[^0-9]/g,'');
  const entries=Object.keys(COUNTRY_DIAL_CODES).map(iso=>({iso:iso,name:countryName(iso),dial:'+'+COUNTRY_DIAL_CODES[iso]})).sort((a,b)=>a.name.localeCompare(b.name,currentLang==='en'?'en':'ar'));
  const filtered=entries.filter(x=>!q||x.name.toLocaleLowerCase().includes(q)||x.iso.toLowerCase().includes(q)||x.dial.includes(q)||Boolean(digits&&x.dial.replace(/[^0-9]/g,'').includes(digits)));
  results.innerHTML='';
  if(!filtered.length){const empty=document.createElement('div');empty.className='country-search-empty';empty.textContent=currentLang==='en'?'No countries found':'ما لقينا الدولة، جربي اسمًا أو مفتاحًا آخر';results.appendChild(empty);return}
  filtered.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='country-search-option';b.setAttribute('role','option');b.setAttribute('aria-selected',String(activeCountrySelect&&activeCountrySelect.value===x.iso));b.innerHTML='<span class="country-search-check"></span><span class="country-search-name"></span><span class="country-search-dial"></span>';b.querySelector('.country-search-check').textContent=activeCountrySelect&&activeCountrySelect.value===x.iso?'✓':'';b.querySelector('.country-search-name').textContent=x.name+' ('+x.iso+')';b.querySelector('.country-search-dial').textContent=x.dial;b.addEventListener('click',function(){const target=activeCountrySelect;if(!target)return;target.value=x.iso;target.dispatchEvent(new Event('change',{bubbles:true}));if(target.id==='checkoutCountryCode'){try{localStorage.setItem('lf_checkout_country_explicit','1')}catch(e){}if(typeof saveCheckoutDraft==='function')saveCheckoutDraft()}closeCountrySearch()});results.appendChild(b)});
 };
 layer._input=input;
 layer.querySelector('.country-search-close').addEventListener('click',closeCountrySearch);
 layer.addEventListener('click',function(e){if(e.target===layer)closeCountrySearch()});
 input.addEventListener('input',function(){layer._draw(input.value)});
 return layer
}
function updateCountrySearchTrigger(select){
 const trigger=select&&select.parentElement&&select.parentElement.querySelector('.country-search-trigger');if(!trigger)return;
 const option=select.selectedOptions&&select.selectedOptions[0],name=option&&option.textContent||countryName(select.value||'PS')+' (+970)';
 trigger.querySelector('.country-trigger-label').textContent=name
}
function enhanceCountrySelect(select){
 if(!select)return;const existing=select.parentElement&&select.parentElement.querySelector('.country-search-trigger');
 if(existing){updateCountrySearchTrigger(select);return}
 ensureCountrySearchOverlay();const wrap=document.createElement('div');wrap.className='country-search-wrap';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='country-search-trigger';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.innerHTML='<span class="country-trigger-label"></span><span class="country-trigger-arrow" aria-hidden="true">⌄</span>';
 trigger.addEventListener('click',function(){openCountrySearch(select,trigger)});select.parentNode.insertBefore(wrap,select);wrap.appendChild(trigger);wrap.appendChild(select);select.classList.add('country-native-select');select.addEventListener('change',function(){updateCountrySearchTrigger(select)});updateCountrySearchTrigger(select)
}
function openCountrySearch(select,trigger){
 const layer=ensureCountrySearchOverlay();activeCountrySelect=select;layer._draw('');layer.hidden=false;trigger.setAttribute('aria-expanded','true');document.body.classList.add('country-search-open');layer._input.value='';layer._input.focus()
}
function closeCountrySearch(){
 if(!countrySearchOverlay||countrySearchOverlay.hidden)return;
 countrySearchOverlay.hidden=true;document.body.classList.remove('country-search-open');const target=activeCountrySelect;activeCountrySelect=null;const trigger=target&&target.parentElement&&target.parentElement.querySelector('.country-search-trigger');if(trigger){trigger.setAttribute('aria-expanded','false');trigger.focus()}
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&countrySearchOverlay&&!countrySearchOverlay.hidden)closeCountrySearch()});
function selectedDial(id){const el=document.getElementById(id);if(!el)return '+970';return el.selectedOptions?.[0]?.dataset.dial||('+ '+(COUNTRY_DIAL_CODES[el.value]||'970')).replace(' ','')}
function fillCountrySelect(id,selected='PS'){const el=document.getElementById(id);if(!el)return;const keep=selected||el.value||'PS';el.innerHTML=countryOptions(keep);enhanceCountrySelect(el);}
function initCountrySelectors(){const a=getAccount?.();const aSel=document.getElementById('accountCountryCode');if(aSel){fillCountrySelect('accountCountryCode',a?.countryIso||'PS');if(a?.countryIso&&COUNTRY_DIAL_CODES[a.countryIso])aSel.value=a.countryIso}const aeSel=document.getElementById('accountCountryEdit');if(aeSel){fillCountrySelect('accountCountryEdit',a?.countryIso||'PS');if(a?.countryIso&&COUNTRY_DIAL_CODES[a.countryIso])aeSel.value=a.countryIso}const cSel=document.getElementById('checkoutCountryCode');if(cSel){const draft=load('lf_checkout_draft',{});const defaultIso=draft?.countryExplicit&&draft?.countryIso?draft.countryIso:'PS';fillCountrySelect('checkoutCountryCode',defaultIso);if(COUNTRY_DIAL_CODES[defaultIso])cSel.value=defaultIso;updateCountrySearchTrigger(cSel)}}
function internationalPhone(countryIso,number){let n=String(number||'').trim().replace(/[\s\-().]/g,'');if(!n)return '';if(/^00/.test(n))n='+'+n.slice(2);if(/^\+/.test(n))return '+'+n.slice(1).replace(/\D/g,'');const dial=COUNTRY_DIAL_CODES[countryIso]||'970';n=n.replace(/\D/g,'');if(n.startsWith(dial))return '+'+n;if(n.startsWith('0'))n=n.slice(1);return '+'+dial+n}
function normalizePhone(v,countryIso=''){let n=String(v||'').trim().replace(/[\s\-().]/g,'');if(/^00/.test(n))n='+'+n.slice(2);if(/^\+/.test(n))return '+'+n.slice(1).replace(/\D/g,'');if(countryIso)return internationalPhone(countryIso,n);return n.replace(/\D/g,'')}
function validMobile(v,countryIso=''){const n=normalizePhone(v,countryIso);return /^\+[1-9]\d{6,14}$/.test(n)}
function detectCountryByGPS(targetId='accountCountryCode'){const btn=document.getElementById('gpsCountryBtn');if(btn){btn.disabled=true;btn.textContent='📍 جارٍ تحديد الدولة...'}if(!navigator.geolocation){if(btn){btn.disabled=false;btn.textContent='📍 تحديد الدولة تلقائيًا'}return alert('المتصفح لا يدعم تحديد الموقع. اختاري الدولة يدويًا.')}navigator.geolocation.getCurrentPosition(async pos=>{try{const u=`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(pos.coords.latitude)}&longitude=${encodeURIComponent(pos.coords.longitude)}&localityLanguage=${currentLang==='en'?'en':'ar'}`;const r=await fetch(u);const d=await r.json();const iso=String(d.countryCode||'').toUpperCase();if(!COUNTRY_DIAL_CODES[iso])throw new Error('country');const el=document.getElementById(targetId);if(el){el.value=iso;el.dispatchEvent(new Event('change',{bubbles:true}))}const name=d.countryName||countryName(iso);if(targetId==='accountCountryCode'){const a=load(ACCOUNT_KEY,{});a.countryIso=iso;a.countryName=name;save(ACCOUNT_KEY,a)}if(btn){btn.disabled=false;btn.textContent='📍 تم تحديد الدولة: '+name}setTimeout(()=>{if(btn)btn.textContent='📍 تحديد الدولة تلقائيًا'},2500)}catch(e){if(btn){btn.disabled=false;btn.textContent='📍 تحديد الدولة تلقائيًا'}alert('تعذر تحديد الدولة تلقائيًا. اختاريها يدويًا.')}},()=>{if(btn){btn.disabled=false;btn.textContent='📍 تحديد الدولة تلقائيًا'}alert('لم يتم السماح بالموقع. يمكنك اختيار الدولة يدويًا بدون GPS.')},{enableHighAccuracy:true,timeout:10000,maximumAge:300000})}
function syncCountryDialPreview(selectId,inputId){const s=document.getElementById(selectId),i=document.getElementById(inputId);if(!s||!i)return;const dial=s.selectedOptions?.[0]?.dataset.dial||'+970';i.dataset.dial=dial;const hint=document.getElementById(inputId==='phone'?'phoneDialHint':(inputId==='accountContactEdit'?'accountDialEdit':'accountDialHint'));if(hint)hint.textContent=dial}


function makeOrderItems(pay){return cart.map(i=>{const p=products.find(x=>x.id===i.id);if(!p)return null;const qty=Math.max(1,Number(i.qty)||1),price=Number(p.price)||0,base=price*qty,visaPct=Math.min(100,Math.max(0,Number(storeCommerceSettings.visaDiscountPercent)||0)),disc=pay==='visa'?base*(visaPct/100):0;const pkg=getPackaging(i.packagingId);const packagingPrice=pkg?Math.max(0,Number(pkg.price)||0):0;return {productId:p.id,name:p.name,en:p.en,cat:p.cat,variant:i.variant||'',price,old:Number(p.old)||0,desc:p.desc||'',images:Array.isArray(p.images)?p.images.slice(0,8):[],qty,visaDiscountPercent:visaPct,visaDiscountAmount:disc,packagingId:i.packagingId||'',packagingName:pkg?(pkg.nameAr||pkg.nameEn):'',packagingPrice,lineTotal:base-disc+packagingPrice*qty}}).filter(Boolean)}
function whatsappOrderUrl(order){const lines=['🛍️ *طلب جديد - Ladies First*',`رقم الطلب: #${order.id}`,`👤 ${order.name}`,`📞 ${order.phone}`,`📍 ${order.city} — ${order.address}`,`💳 ${currentLang==='en'?'Payment':'الدفع'}: ${order.pay==='visa'?'Visa — لم يتم تحصيل المبلغ إلكترونياً':(currentLang==='en'?'Cash on delivery':'الدفع عند الاستلام')}`,'','*المنتجات:*'];order.items.forEach(it=>{lines.push(`• ${it.name} × ${it.qty} — ${Number(it.lineTotal).toFixed(2)} ₪`);if(order.pay==='visa'&&Number(it.visaDiscountPercent)>0)lines.push(`  خصم Visa ${it.visaDiscountPercent}%`);if(Number(it.packagingPrice)>0)lines.push(`  🎁 التغليف: ${it.packagingName||'تغليف'} +${Number(it.packagingPrice).toFixed(2)} ₪`)});if(order.giftCard){lines.push('','🎁 بطاقة معايدة مرفقة',`المناسبة: ${order.giftCard.occasionLabel||order.giftCard.occasion}`,`إلى: ${order.giftCard.recipient}`,`النص: ${order.giftCard.message}`);if(order.giftCard.sender)lines.push(`من: ${order.giftCard.sender}`)}if(Number(order.couponDiscount)>0)lines.push(`🎟️ كود الخصم: ${order.couponCode} — -${Number(order.couponDiscount).toFixed(2)} ₪`);lines.push('',`🚚 ${currentLang==='en'?'Delivery:':'التوصيل:'} ${order.shippingRegionName||''} — ${order.shippingWaived?'معفى':Number(order.shippingFee||0).toFixed(2)+' ₪'}`,`💰 ${currentLang==='en'?'Total:':'الإجمالي:'} ${Number(order.total).toFixed(2)} ₪`,`📝 ${order.notes|| (currentLang==='en'?'No notes':'لا توجد ملاحظات')}`);return storeWhatsAppHref(lines.join('\n'))}
function sendOrderWhatsApp(order){window.open(whatsappOrderUrl(order),'_blank','noopener')}
function customerOrderSuccessHtml(orderId,pay){
  const gender=String(getAccount()?.gender||'').trim().toLowerCase();
  const male=['male','m','ذكر'].includes(gender);
  const title=currentLang==='en'?'Thank you for choosing Ladies First 🌸':male?'شكرًا لاختيارك Ladies First 🌸':'شكرًا لاختياركِ Ladies First، سيدتي 🌸';
  const copy=currentLang==='en'?'We have received your order and will prepare it with care. We appreciate your trust and are happy to help whenever you need us.':male?'استلمنا طلبك رقم #'+orderId+'، وسنعمل على تجهيزه بعناية. نقدّر ثقتك بنا، ويسعدنا خدمتك في أي وقت.':'استلمنا طلبك رقم #'+orderId+'، وسنعمل على تجهيزه بعناية. نقدّر ثقتكِ بنا، ويسعدنا خدمتكِ في أي وقت.';
  const payment=pay==='visa'?(currentLang==='en'?'<p>Payment was not collected online. We will contact you to arrange it conveniently.</p>':'<p>لم يتم تحصيل المبلغ إلكترونيًا بعد، وسنتواصل معك بكل سهولة لترتيب الدفع.</p>'):'';
  const orderLabel=currentLang==='en'?'Order number:':'رقم الطلب:';
  const browse=currentLang==='en'?'You may continue browsing whenever you like.':'يمكنك متابعة تصفّح المتجر بكل راحة، ويسعدنا خدمتك دائمًا.';
  return '<div class="success"><b>'+title+'</b><p>'+copy+'</p>'+payment+'<p>'+orderLabel+' #'+orderId+'</p><p>'+browse+'</p></div>';
}
function appendOrderWhatsAppButton(order){
  const box=document.querySelector('#checkout .success');if(!box)return;
  const button=document.createElement('button');button.type='button';button.className='add';button.style.marginTop='10px';
  button.textContent='💬 '+(currentLang==='en'?'Send order details on WhatsApp':'إرسال تفاصيل الطلب عبر WhatsApp');
  button.addEventListener('click',()=>sendOrderWhatsApp(order));box.appendChild(button);
}
function placeOrder(){if(!cart.length)return alert(currentLang==='en'?'Your cart is empty':'السلة فارغة');const name=document.getElementById('name').value.trim(),phoneRaw=document.getElementById('phone').value.trim(),countryIso=document.getElementById('checkoutCountryCode')?.value||'PS',phone=normalizePhone(phoneRaw,countryIso),city=document.getElementById('city').value.trim(),address=document.getElementById('address').value.trim();if(!name||!phoneRaw||!city||!address)return alert(currentLang==='en'?'Please fill in name, phone, city and address':'يرجى تعبئة الاسم والجوال والمدينة والعنوان');if(!validMobile(phoneRaw,countryIso))return alert(currentLang==='en'?'Enter a valid international mobile number':'أدخل رقم جوال صحيح مع اختيار الدولة');const pay=document.querySelector('input[name="pay"]:checked')?.value||'cod';const items=makeOrderItems(pay);if(!items.length)return alert('تعذر تجهيز المنتجات في الطلب');for(const it of items){const p=products.find(x=>x.id===it.productId);const available=variantStock(p,it.variant);if(!p||Number(it.qty)>available)return alert(insufficientStockMessage(available))}const totals=getCartTotals(pay);const total=totals.total;const orders=load('lf_orders',[]);const giftCard=currentGiftCard||loadGiftCardDraft();const baseNotes=document.getElementById('notes').value.trim();const giftNote=giftCard?`بطاقة معايدة: ${giftCard.title} — إلى ${giftCard.recipient} — ${giftCard.message}${giftCard.sender?' — من '+giftCard.sender:''}`:'';const order={id:Date.now(),createdAt:Date.now(),date:new Date().toLocaleString('ar-PS'),name,phone:normalizePhone(phone),city,address,notes:[baseNotes,giftNote].filter(Boolean).join(' | '),giftCard,pay,total,subtotal:totals.subtotal,visaDiscount:totals.visaDiscount,couponCode:totals.coupon?.code||'',couponDiscount:totals.couponDiscount||0,couponType:totals.coupon?.type||'',couponValue:totals.coupon?.value||0,shippingRegion:totals.shippingRegion,shippingRegionName:totals.shippingRegionName,shippingFee:totals.shippingFee,shippingWaived:false,accountRef:getAccount()?.contact||'',items,status:'جديد',inventoryState:'deducted'};orders.unshift(order);if(!save('lf_orders',orders))return;items.forEach(it=>{const p=products.find(x=>x.id===it.productId);const vs=variantList(p);if(vs.length){const v=p.variants.find(v=>v.name===it.variant);if(v)v.stock=Math.max(0,Number(v.stock)||0)-Number(it.qty);p.stock=totalStock(p)}else p.stock=Math.max(0,(Number(p.stock)||0)-Number(it.qty));});save('lf_products',products);cart=[];save('lf_cart',cart);couponCode='';localStorage.removeItem('lf_coupon');clearCheckoutDraft();setGiftCardDraft(null);renderProducts();renderCart();document.getElementById('drawer').style.display='block';document.getElementById('checkout').innerHTML=customerOrderSuccessHtml(order.id,pay);appendOrderWhatsAppButton(order);setTimeout(()=>sendOrderWhatsApp(order),350)}
let heroIndex=0,heroTimer=null,heroLayer='A',heroRenderRequest=0;
function getCustomHeroSlides(){
  let arr=load('lf_hero_slides',null);
  if(!Array.isArray(arr)) arr=[];
  return arr.filter(x=>x&&x.image);
}

const DEFAULT_HERO_TEXT_STYLE={font:'Tahoma,Arial,sans-serif',color:'#ffffff',opacity:1,bgColor:'#63345e',bgOpacity:.58,x:70,y:70};
function getHeroTextStyle(){
  const s=load('lf_hero_text_style',DEFAULT_HERO_TEXT_STYLE)||DEFAULT_HERO_TEXT_STYLE;
  return {font:s.font||DEFAULT_HERO_TEXT_STYLE.font,color:s.color||DEFAULT_HERO_TEXT_STYLE.color,opacity:Math.max(0,Math.min(1,Number(s.opacity??1))),bgColor:s.bgColor||DEFAULT_HERO_TEXT_STYLE.bgColor,bgOpacity:Math.max(0,Math.min(1,Number(s.bgOpacity??DEFAULT_HERO_TEXT_STYLE.bgOpacity))),x:Math.max(0,Math.min(100,Number(s.x??DEFAULT_HERO_TEXT_STYLE.x))),y:Math.max(0,Math.min(100,Number(s.y??DEFAULT_HERO_TEXT_STYLE.y)))};
}
function hexToRgba(hex,a){const h=String(hex||'#63345e').replace('#','');const v=h.length===3?h.split('').map(x=>x+x).join(''):h;const n=parseInt(v,16);if(Number.isNaN(n))return `rgba(99,52,94,${a})`;return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
function applyHeroTextStyle(){
  const s=getHeroTextStyle();
  document.documentElement.style.setProperty('--hero-font',s.font);
  document.documentElement.style.setProperty('--hero-text-color',s.color);
  document.documentElement.style.setProperty('--hero-text-opacity',String(s.opacity));
  document.documentElement.style.setProperty('--hero-text-bg',hexToRgba(s.bgColor,s.bgOpacity));
  document.documentElement.style.setProperty('--hero-text-x',`${s.x}%`);
  document.documentElement.style.setProperty('--hero-text-y',`${s.y}%`);
}
function heroSlides(){
  const base=load('lf_hero',DEFAULT_HERO)||DEFAULT_HERO;
  const custom=getCustomHeroSlides();
  const baseSlide={image:base.image||LOGO,titleAr:'كل ما تحتاجينه.. في مكان واحد',titleEn:'Everything you need.. in one place',descAr:'منتجات مختارة بعناية لتكملي إطلالتك.',descEn:'Carefully selected products to complete your look.',id:'main-site-image'};
  const arr=[];
  (custom.length?custom:[baseSlide]).forEach(x=>{
    const key=x.image||'';
    if(!key)return;
    arr.push({image:key,mobileImage:x.mobileImage||'',title:currentLang==='en'?(x.titleEn||x.titleAr||'Ladies First'):(x.titleAr||x.titleEn||'Ladies First'),desc:currentLang==='en'?(x.descEn||x.descAr||''):(x.descAr||x.descEn||''),id:x.id,hideText:x.hideText===true});
  });
  return arr;
}
function heroMobileImageFor(slide){
  if(slide.mobileImage)return slide.mobileImage;
  const source=String(slide.image||'');
  const mapped=source.replace(/(slide-(?:01-boutique|02-bag|03-beauty|04-jewelry))\.webp(?=[?#]|$)/,'$1-mobile.webp');
  return mapped===source?'':mapped;
}
function renderHeroSlider(fade=true){
  applyHeroTextStyle();
  const effect=load('lf_hero_text_style',{}).transition||'smooth';
  document.querySelector('.heroCard')?.setAttribute('data-transition',effect);
  const slides=heroSlides();
  if(!slides.length)return;
  if(heroIndex>=slides.length)heroIndex=0;
  const s=slides[heroIndex];
  const title=document.getElementById('heroTitle'),desc=document.getElementById('heroDesc'),cta=document.getElementById('heroCta');
  if(title)title.textContent=s.title;if(desc)desc.textContent=s.desc;if(cta)cta.textContent=currentLang==='en'?'Shop now':'تسوقي الآن';
  const heroCard=document.querySelector('.heroSlider .heroCard');if(heroCard)heroCard.classList.toggle('logo-only',!!s.hideText);const textPanel=document.querySelector('.heroSlider .heroText');if(textPanel)textPanel.hidden=!!s.hideText;
  const request=++heroRenderRequest;
  const layerA=document.getElementById('heroLogoA'),layerB=document.getElementById('heroLogoB');
  const previous=layerB?.classList.contains('active')&&layerB.style.zIndex==='2'?layerB:layerA?.classList.contains('active')?layerA:layerB?.classList.contains('active')?layerB:null;
  const active=previous===layerA?layerB:layerA;
  const mobile=typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(max-width: 700px)').matches;
  const image=safeImg((mobile?heroMobileImageFor(s):'')||s.image,LOGO);
  const reveal=src=>{
    if(request!==heroRenderRequest||!active)return;
    active.classList.remove('active');void active.offsetWidth;
    active.src=src;active.style.zIndex='2';if(previous)previous.style.zIndex='1';
    active.classList.add('active');
    if(['smooth','fade'].includes(effect)&&fade){
      // Keep the previous image solid until the incoming image has fully appeared.
      setTimeout(()=>{if(request===heroRenderRequest)previous?.classList.remove('active')},2000);
    }else previous?.classList.remove('active');
    if(fade&&textPanel&&typeof textPanel.animate==='function'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)textPanel.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:2000,easing:'cubic-bezier(.22,1,.36,1)',composite:'add'});
  };
  if(typeof Image==='undefined')reveal(image);
  else{
    const preload=new Image();let fallbackUsed=false;
    preload.onload=()=>{const ready=typeof preload.decode==='function'?preload.decode().catch(()=>{}):Promise.resolve();ready.then(()=>reveal(preload.src))};
    preload.onerror=()=>{if(fallbackUsed)return;fallbackUsed=true;preload.src=safeImg(s.image,LOGO)};
    preload.src=image;
    // Warm the next slide while the current one is on screen.
    const next=slides[(heroIndex+1)%slides.length];if(next){const warm=new Image();warm.src=safeImg((mobile?heroMobileImageFor(next):'')||next.image,LOGO)}
  }
  const dots=document.getElementById('heroDots');
  if(dots)dots.innerHTML=slides.map((_,i)=>`<button class="${i===heroIndex?'active':''}" onclick="heroGo(${i})"></button>`).join('');
}
if(typeof window!=='undefined'&&window.matchMedia){const heroMobileQuery=window.matchMedia('(max-width: 700px)');const heroMobileChange=()=>renderHeroSlider(false);if(heroMobileQuery.addEventListener)heroMobileQuery.addEventListener('change',heroMobileChange);else if(heroMobileQuery.addListener)heroMobileQuery.addListener(heroMobileChange)}
function heroGo(i){heroIndex=i;heroLayer=heroLayer==='A'?'B':'A';renderHeroSlider(true);restartHeroTimer()}
function heroMove(d){const n=heroSlides().length;if(n<2)return;heroIndex=(heroIndex+d+n)%n;heroLayer=heroLayer==='A'?'B':'A';renderHeroSlider(true);restartHeroTimer()}
function restartHeroTimer(){clearTimeout(heroTimer);if(heroSlides().length<2)return;heroTimer=setTimeout(()=>{heroMove(1)},Math.max(2,Math.min(30,Number(load('lf_hero_text_style',{}).intervalSeconds)||3))*1000)}
function pauseHeroTimer(){clearTimeout(heroTimer)}
function resumeHeroTimer(){restartHeroTimer()}

const DEFAULT_SOCIAL_LINKS={whatsapp:{label:'واتساب',icon:'fa-brands fa-whatsapp',url:storeWhatsAppHref(),enabled:true,cls:'social-wa'},instagram:{label:'Instagram',icon:'fa-brands fa-instagram',url:'',enabled:true,cls:'social-instagram'},snapchat:{label:'Snapchat',icon:'fa-brands fa-snapchat',url:'',enabled:true,cls:'social-snapchat'},facebook:{label:'Facebook',icon:'fa-brands fa-facebook',url:'',enabled:true,cls:'social-facebook'},tiktok:{label:'TikTok',icon:'fa-brands fa-tiktok',url:'',enabled:true,cls:'social-tiktok'}};
function getSocialLinks(){const x=load('lf_social_links',null);const out={...DEFAULT_SOCIAL_LINKS};if(x&&typeof x==='object')Object.keys(out).forEach(k=>out[k]={...out[k],...(x[k]||{})});out.whatsapp.url=out.whatsapp.url||storeWhatsAppHref();return out}
function renderSocialLinks(){const el=document.getElementById('sideSocialLinks');if(!el)return;const links=getSocialLinks();el.innerHTML=Object.values(links).filter(x=>x.enabled!==false).map(x=>{const label=esc(x.label),icon=esc(x.icon),cls=esc(x.cls||''),url=String(x.url||'').trim();return url?'<a class="socialSideLink '+cls+'" href="'+esc(safeLink(url))+'" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="'+icon+'" aria-hidden="true"></i><span>'+label+'</span></a>':'<div class="socialSideLink '+cls+' is-unconfigured" aria-disabled="true"><i class="'+icon+'" aria-hidden="true"></i><span>'+label+'<small>'+(currentLang==='en'?'Link not added yet':'الرابط غير مضاف بعد')+'</small></span></div>'}).join('')}
function toggleSideMenu(){const o=document.getElementById('sideMenuOverlay');if(!o)return;const open=!o.classList.contains('open');o.classList.toggle('open',open);document.body.classList.toggle('side-menu-open',open);if(open){renderSideAccountGreeting();renderSocialLinks()}}function goHome(){document.getElementById('sideMenuOverlay')?.classList.remove('open');document.body.classList.remove('side-menu-open');window.scrollTo({top:0,behavior:'smooth'})}function isSearchEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value||'').trim())}
function refreshSearchFor(el){if(el?.id==='quickSearchInput')renderQuickSearchResults();else renderProducts()}
function clearSearchAutofill(el){if(!el||!isSearchEmail(el.value))return false;el.value='';refreshSearchFor(el);return true}
function activateStoreSearch(el){if(!el)return;el.removeAttribute('readonly');el.setAttribute('autocomplete','off');[0,180,650,1300].forEach(ms=>setTimeout(()=>{if(document.activeElement===el)clearSearchAutofill(el)},ms))}
function handleStoreSearchInput(el){if(clearSearchAutofill(el))return;renderProducts();queueSearchHistory(el.value)}
function handleQuickSearchInput(el){if(clearSearchAutofill(el))return;renderQuickSearchResults();queueSearchHistory(el.value)}
function renderQuickSearchResults(){const input=document.getElementById('quickSearchInput'),root=document.getElementById('quickSearchResults');if(!input||!root)return;const q=String(input.value||'').trim().toLowerCase();if(!q){root.innerHTML='<p class="quickSearchEmpty">'+(currentLang==='en'?'Type a product name to see results.':'اكتبي اسم المنتج لتظهر النتائج مباشرة')+'</p>';return}const list=products.filter(p=>(String(p.name||'')+' '+String(p.en||'')+' '+String(p.desc||'')+' '+String(p.brand||'')).toLowerCase().includes(q)).slice(0,15);root.innerHTML=list.length?list.map(p=>'<button class="quickSearchResult" type="button" onclick="closeQuickSearch();openProduct('+Number(p.id)+')"><img src="'+safeImg(mainImagesOf(p)[0],LOGO)+'" alt=""><span><b>'+esc(p.name||p.en||'')+'</b><small>'+esc(String(p.price??0))+' ₪</small></span><i aria-hidden="true">›</i></button>').join(''):'<p class="quickSearchEmpty">'+(currentLang==='en'?'No matching products.':'ما لقينا منتجات مطابقة')+'</p>'}
function openQuickSearch(source){const overlay=document.getElementById('quickSearchOverlay');if(!overlay)return;overlay.dataset.source=source||'search';overlay.classList.add('open');document.body.classList.add('quick-search-open');renderQuickSearchResults();setTimeout(()=>{const input=document.getElementById('quickSearchInput');activateStoreSearch(input);input?.focus();if(input)clearSearchAutofill(input)},40)}
function closeQuickSearch(){const overlay=document.getElementById('quickSearchOverlay');overlay?.classList.remove('open');document.body.classList.remove('quick-search-open')}
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeQuickSearch()});
window.addEventListener('pageshow',()=>document.querySelectorAll('.storeSearchInput').forEach(clearSearchAutofill));
function updateNavCounts(){const n=cart.reduce((a,i)=>a+(Number(i.qty)||0),0);['bottomCount','sideCount'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=n})}const _updateCount=updateCount;updateCount=function(){_updateCount();updateNavCounts()};
function renderNewUiLang(){const en=currentLang==='en';const m={sideMenuTitle:en?'Menu':'القائمة',sideHomeText:en?'Home':'الرئيسية',sideSearchText:en?'Search':'البحث',sideCatsLabel:en?'Categories':'الأصناف',sideCartText:en?'Shopping cart':'سلة التسوق',sideReturnsText:en?'Exchange & Return Policy':'سياسة التبديل والإرجاع',sideAboutText:en?'About us':'من نحن',footerAboutText:en?'About us':'من نحن',bnHome:en?'Home':'الرئيسية',bnCats:en?'Categories':'الأصناف',bnCart:en?'Cart':'السلة',bnSearch:en?'Search':'بحث',headerSearchText:en?'Search for a product':'ابحثي عن قطعة مميزة',quickSearchTitle:en?'Search products':'بحث عن المنتجات',quickSearchHint:en?'Enter a product name to see results':'اكتبي اسم المنتج لتظهر النتائج مباشرة',historySearchText:en?'Recent searches':'عمليات البحث',bnWhats:'WhatsApp'};Object.entries(m).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v});const qi=document.getElementById('quickSearchInput');if(qi){qi.placeholder=en?'Search products...':'ابحثي عن منتج...';qi.setAttribute('aria-label',en?'Search products':'بحث المنتجات')}}
window.addEventListener('storage',e=>{if(['lf_feature_carousels','lf_products','lf_cats','lf_brands','lf_hero','lf_hero_slides','lf_hero_text_style','lf_store_description','lf_favorites','lf_account','lf_social_links','lf_users'].includes(e.key)){products=load('lf_products',products);cats=load('lf_cats',cats);brands=load('lf_brands',brands);if(e.key==='lf_store_description')applyStoreDescription(load('lf_store_description','ONLINE STORE'));renderHero();heroIndex=0;renderHeroSlider();restartHeroTimer();renderCats();renderProducts();renderFeatureSections()}if(e.key==='lf_cart'){cart=load('lf_cart',[]);renderProducts();renderCart()}});
function openProductFromHash(){const m=(location.hash||'').match(/^#product-(\d+)$/);if(m){const id=Number(m[1]);if(products.some(p=>p.id===id)){openProduct(id)}}else{const modal=document.getElementById('modal');if(modal)modal.style.display='none';}}
window.addEventListener('hashchange',openProductFromHash);window.addEventListener('popstate',openProductFromHash);document.getElementById('cartBtn').onclick=openCart;document.getElementById('lang').onclick=toggleLanguage;document.getElementById('lang').textContent=currentLang==='ar'?'EN':'عربي';renderHistory();renderStaticLang();renderMaintenanceMode();setTimeout(openProductFromHash,50);
renderHero();applyHeroTextStyle();renderHeroSlider();restartHeroTimer();renderNewUiLang();renderCats();renderProducts();renderFeatureSections();renderQuickOffers();renderCart();updateNavCounts();updateAccountBadge();updateStoreWhatsAppLinks();renderSocialLinks();

const heroCardEl=document.querySelector('.heroSlider .heroCard');if(heroCardEl){heroCardEl.addEventListener('mouseenter',pauseHeroTimer);heroCardEl.addEventListener('mouseleave',resumeHeroTimer);heroCardEl.addEventListener('touchstart',pauseHeroTimer,{passive:true});heroCardEl.addEventListener('touchend',()=>setTimeout(resumeHeroTimer,700),{passive:true});}document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseHeroTimer();else restartHeroTimer()});


/* ================= REAL BACKEND BRIDGE ================= */

window.LF_API_URL=window.LF_API_URL || (location.protocol==='file:'?'http://localhost:3000':location.origin);
const LF_TOKEN_KEY='lf_token';
function lfToken(){return localStorage.getItem(LF_TOKEN_KEY)||''}
async function lfFetch(path,options={}){const headers={'Content-Type':'application/json',...(options.headers||{})};const t=lfToken();if(t)headers.Authorization='Bearer '+t;const r=await fetch(window.LF_API_URL+path,{...options,headers});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(d.message||d.error||('HTTP_'+r.status)),{status:r.status,data:d});return d}
function lfMapProduct(p){const m=p.metadata||{},images=Array.isArray(p.images)&&p.images.length?p.images:[p.imageUrl||p.image_url].filter(Boolean),hasMain=Array.isArray(p.mainImages)&&p.mainImages.length;return normalizeProductImages({...p,...m,id:isNaN(Number(p.id))?p.id:Number(p.id),en:m.en||p.en||p.name,old:p.old_price??p.oldPrice??p.old??0,cost:p.cost_price??p.cost??0,cat:p.category??p.cat??'',desc:p.description??p.desc??'',mainImages:hasMain?p.mainImages:images.slice(0,1),subImages:hasMain?(p.subImages||[]):images.slice(1),images,variants:(p.variants||[]).map(v=>({...v,name:v.name||v.color||''}))})}
async function lfSyncProducts(){try{const d=await lfFetch('/api/products');if(Array.isArray(d.products)){products=d.products.map(lfMapProduct);save('lf_products',products);renderProducts();await lfSyncFeatured()}}catch(e){console.warn('API products unavailable',e.message)}}
let lfFeaturedRequest=0;
async function lfSyncFeatured(){
  const request=++lfFeaturedRequest;
  window.LF_BEST_SELLERS=[];window.LF_BEST_SELLERS_STATUS='loading';renderFeatureSections();
  try{
    const d=await lfFetch('/api/store/best-sellers');
    if(request!==lfFeaturedRequest)return;
    if(!Array.isArray(d.bestSellers))throw Error('Invalid best-seller response');
    window.LF_BEST_SELLERS=d.bestSellers;window.LF_BEST_SELLERS_PERIOD=d.period;window.LF_BEST_SELLERS_STATUS='ready';
  }catch(e){if(request!==lfFeaturedRequest)return;window.LF_BEST_SELLERS_STATUS='error';console.warn('Best sellers unavailable',e.message)}
  renderFeatureSections();
}
async function lfSyncMe(){if(!lfToken())return null;try{const d=await lfFetch('/api/auth/me');if(d.user){const old=load(ACCOUNT_KEY,null)||{},serverOptIn=d.user.whatsapp_opt_in??d.user.whatsappOptIn,whatsappOptIn=serverOptIn!==undefined?serverOptIn===true||serverOptIn===1||serverOptIn==='1'||serverOptIn==='true':old.whatsapp_opt_in===true||old.whatsapp_opt_in===1||old.whatsapp_opt_in==='1'||old.whatsapp_opt_in==='true';const a={...old,...d.user,type:old.type||(d.user.email?'email':'whatsapp'),whatsapp_opt_in:whatsappOptIn};save(ACCOUNT_KEY,a);registerUserRecord(a);return a}}catch(e){if(e.status===401){localStorage.removeItem(LF_TOKEN_KEY);localStorage.removeItem(ACCOUNT_KEY)}}return null}
async function lfSyncMyOrders(){if(!lfToken())return;try{const d=await lfFetch('/api/orders');if(Array.isArray(d.orders))save('lf_orders',d.orders.map(o=>({id:o.id,createdAt:o.created_at,date:new Date(o.created_at).toLocaleString('ar-PS'),name:o.customer_name,phone:o.customer_phone||o.customer_contact,user_id:o.user_id,accountRef:getAccount()?.contact||'',statusHistory:o.status_history||o.statusHistory||[],address:o.shipping_address||o.customer_address,total:o.total,subtotal:o.subtotal,couponDiscount:o.coupon_discount??o.discount??0,loyaltyDiscount:o.loyalty_discount||0,pointsRedeemed:o.points_redeemed||0,shippingFee:o.shipping_cost??o.shipping??0,shippingBaseCost:o.shipping_base_cost??o.shipping_cost??o.shipping??0,shippingAutoDiscountPercent:o.shipping_discount_percent||0,shippingAutoDiscountAmount:o.shipping_discount_amount||0,shippingManualDiscountPercent:o.shipping_manual_discount_percent||0,shippingManualDiscountAmount:o.shipping_manual_discount_amount||0,shippingRegion:o.shipping_region||'',shippingWaived:o.shipping_waived===true,packagingTotal:o.packaging_cost??o.packaging??0,status:o.status,inventoryState:o.inventory_state,items:(o.items||[]).map(i=>({orderItemId:i.id,productId:i.productId??i.product_id,variant:i.variantName??i.variant_name??'',qty:i.quantity,name:i.productName??i.product_name??i.name_snapshot??'منتج',price:i.unitPrice??i.unit_price??i.price_snapshot??0,image:i.image||'',isGift:i.isGift===true||i.is_gift===true}))})))}catch(e){console.warn('API orders unavailable',e.message)}}
async function saveWhatsAppOptIn(){const v=!!document.getElementById('waOptIn')?.checked;let a={...load(ACCOUNT_KEY,{}),whatsapp_opt_in:v,whatsapp_opt_in_updated_at:Date.now()};try{if(lfToken()){const d=await lfFetch('/api/users/me',{method:'PATCH',body:JSON.stringify({whatsapp_opt_in:v})});a={...a,...(d.user||{}),whatsapp_opt_in:v}}save(ACCOUNT_KEY,a);registerUserRecord(a);renderAccountContent();if(v)await lfCartHeartbeat();alert(v?'تم حفظ تفضيلات واتساب 🌸':'تم حفظ إيقاف رسائل واتساب.')}catch(e){alert('تعذر حفظ تفضيلات واتساب: '+e.message)}}
async function updateAccountWhatsAppNumber(){let a=load(ACCOUNT_KEY,null);if(!a||a.type!=='whatsapp')return;const iso=document.getElementById('accountCountryEdit')?.value||a.countryIso||'PS';const raw=document.getElementById('accountContactEdit')?.value.trim()||'';if(!raw)return alert('أدخلي رقم واتساب.');if(!validMobile(raw,iso))return alert('أدخلي رقم واتساب صحيحًا مع اختيار الدولة.');const contact=normalizePhone(raw,iso);try{if(lfToken()){const d=await lfFetch('/api/users/me',{method:'PATCH',body:JSON.stringify({phone:contact})});a={...a,...(d.user||{})}}a.contact=contact;a.countryIso=iso;a.countryName=countryName(iso);save(ACCOUNT_KEY,a);registerUserRecord(a);renderAccountContent();updateAccountBadge();alert('تم تحديث الدولة والمفتاح ورقم واتساب 🌍💬')}catch(e){alert('تعذر تحديث رقم واتساب: '+e.message)}} 
function normalizedFavoriteIds(list){return [...new Set((Array.isArray(list)?list:[]).map(Number).filter(id=>Number.isInteger(id)&&id>0))].slice(0,200)}
async function lfPersistFavorites(list=getFavorites()){
  if(!lfToken())return [];
  const favorites=normalizedFavoriteIds(list);
  const d=await lfFetch('/api/account/favorites',{method:'PUT',body:JSON.stringify({favorites})});
  return normalizedFavoriteIds(d.favorites||favorites);
}
async function lfSyncFavorites(){
  if(!lfToken())return;
  try{
    const d=await lfFetch('/api/account/favorites');
    const local=normalizedFavoriteIds(load(FAV_KEY,[]));
    const remote=normalizedFavoriteIds(d.favorites||[]);
    const merged=normalizedFavoriteIds([...remote,...local]);
    save(FAV_KEY,merged);
    if(merged.length!==remote.length||merged.some(id=>!remote.includes(id)))await lfPersistFavorites(merged);
    updateAccountBadge();
    renderProducts();
    renderQuickOffers();
  }catch(e){console.warn('Favorites sync unavailable',e.message)}
}
function mergeCartSnapshot(localItems,remoteItems){
  const merged=new Map();
  const add=(item,remote=false)=>{
    const id=Number(item?.id??item?.productId),qty=Math.max(1,Number(item?.qty??item?.quantity)||1);
    if(!Number.isInteger(id)||id<=0)return;
    const variant=String(item?.variant??item?.variantName??'').trim();
    const packagingId=String(item?.packagingId??item?.packaging_id??'').trim();
    const key=id+'|'+variant+'|'+packagingId;
    const existing=merged.get(key);
    if(existing)existing.qty=Math.max(existing.qty,qty);
    else merged.set(key,{id,qty,variant,packagingId});
  };
  (Array.isArray(remoteItems)?remoteItems:[]).forEach(x=>add(x,true));
  (Array.isArray(localItems)?localItems:[]).forEach(x=>add(x,false));
  return [...merged.values()].slice(0,100);
}
async function lfRestoreCartSnapshot(){
  if(!lfToken())return;
  try{
    const d=await lfFetch('/api/cart/snapshot');
    const remote=d.snapshot?.items||[];
    const merged=mergeCartSnapshot(cart,remote);
    cart=merged;
    save('lf_cart',cart);
    renderCart();
    renderProducts();
    updateCount();
    await lfCartHeartbeat();
  }catch(e){console.warn('Cart restore unavailable',e.message)}
}
async function lfSyncAccountState(){
  if(!lfToken())return;
  await lfSyncFavorites();
  await lfRestoreCartSnapshot();
}
async function lfCartHeartbeat(){if(!lfToken())return;if(!cart.length)return lfClearCartHeartbeat();const items=cart.map(i=>({productId:Number(i.id),qty:Math.max(1,Number(i.qty)||1),variant:i.variant||'',packagingId:i.packagingId||''})).filter(i=>Number.isInteger(i.productId)&&i.productId>0);if(!items.length)return;try{await lfFetch('/api/cart/snapshot',{method:'PUT',body:JSON.stringify({items})})}catch(e){console.warn('Cart snapshot unavailable',e.message)}}
async function lfClearCartHeartbeat(){if(!lfToken())return;try{await lfFetch('/api/cart/snapshot',{method:'DELETE'})}catch(e){console.warn('Cart snapshot clear unavailable',e.message)}}
async function lfLoginAccount(contact,password){
  const d=await lfFetch('/api/auth/login',{method:'POST',body:JSON.stringify({contact,password})});
  localStorage.setItem(LF_TOKEN_KEY,d.token);
  return d.user;
}
async function lfRegisterAccount(a){
  const d=await lfFetch('/api/auth/register',{method:'POST',body:JSON.stringify({name:a.name,email:a.type==='email'?a.contact:'',phone:a.type==='whatsapp'?a.contact:'',password:a.password,gender:a.gender,age:a.age})});
  localStorage.setItem(LF_TOKEN_KEY,d.token);
  return d.user;
}
saveAccount=async function(){
  const contactRaw=document.getElementById('accountContact')?.value.trim()||'';
  const countryIso=document.getElementById('accountCountryCode')?.value||'PS';
  const contact=accountMode==='whatsapp'?normalizePhone(contactRaw,countryIso):contactRaw.toLowerCase();
  const password=document.getElementById('accountPassword')?.value||'';
  if(!contactRaw||!password)return alert('أدخلي وسيلة التواصل وكلمة المرور');
  if(password.length<12)return alert('كلمة المرور يجب أن تكون 12 خانة على الأقل');
  if(accountMode==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactRaw))return alert('أدخلي بريدًا إلكترونيًا صحيحًا');
  if(accountMode==='whatsapp'&&!validMobile(contactRaw,countryIso))return alert('أدخلي رقم واتساب صحيحًا مع اختيار الدولة');

  const isRegister=accountActionMode==='register';
  const name=document.getElementById('accountName')?.value.trim()||'';
  const gender=document.getElementById('accountGender')?.value||'female';
  const age=Math.max(13,Math.min(120,Number(document.getElementById('accountAge')?.value)||0));
  if(isRegister&&(!name||!age))return alert('أدخلي الاسم والجنس والعمر لإنشاء الحساب');

  try{
    let user;
    if(isRegister){
      try{
        user=await lfRegisterAccount({name,contact,type:accountMode,gender,age,password});
      }catch(e){
        if(e.status===409){
          setAccountActionMode('login');
          return alert('هذا الحساب موجود مسبقًا. اختاري تسجيل الدخول واستخدمي كلمة المرور الخاصة بك.');
        }
        throw e;
      }
    }else{
      user=await lfLoginAccount(contact,password);
    }

    const userContact=accountMode==='email'?(user?.email||contact):(user?.phone||contact);
    const safe={
      ...(user||{}),
      serverUserId:user?.id??user?.user_id??null,
      name:user?.name||name||'',
      contact:userContact,
      type:accountMode,
      gender:user?.gender||gender,
      age:user?.age||age||null,
      countryIso:accountMode==='whatsapp'?countryIso:'',
      countryName:accountMode==='whatsapp'?countryName(countryIso):'',
      updatedAt:Date.now()
    };
    save(ACCOUNT_KEY,safe);
    registerUserRecord(safe);
    await lfSyncMyOrders();
    await lfLoadLoyalty();
    await lfSyncAccountState();
    renderAccountContent();
    updateAccountBadge();
    alert(isRegister?'تم إنشاء الحساب وتسجيل الدخول 🌸':'تم تسجيل الدخول بنجاح 🌸');
  }catch(e){
    if(e.status===401)return alert('بيانات تسجيل الدخول غير صحيحة');
    alert((isRegister?'تعذر إنشاء الحساب: ':'تعذر تسجيل الدخول: ')+(e.message||'خطأ غير معروف'));
  }
};
const lfOldLogout=logoutAccount;logoutAccount=async function(){try{await lfFetch('/api/auth/logout',{method:'POST'})}catch{}localStorage.removeItem(LF_TOKEN_KEY);lfOldLogout()};
const lfOldPlaceOrder=placeOrder;
placeOrder=async function(){if(!cart.length)return alert('السلة فارغة');const name=document.getElementById('name').value.trim(),phoneRaw=document.getElementById('phone').value.trim(),countryIso=document.getElementById('checkoutCountryCode')?.value||'PS',phone=normalizePhone(phoneRaw,countryIso),city=document.getElementById('city').value.trim(),address=document.getElementById('address').value.trim();if(!name||!phoneRaw||!city||!address)return alert('يرجى تعبئة الاسم والجوال والمدينة والعنوان');if(!validMobile(phoneRaw,countryIso))return alert('أدخل رقم جوال صحيح');const pay=document.querySelector('input[name="pay"]:checked')?.value||'cod',items=makeOrderItems(pay);if(!items.length)return alert('تعذر تجهيز المنتجات');let userId=null;if(lfToken()){const me=await lfSyncMe();userId=me?.id||null;await lfLoadLoyalty()}const totals=getCartTotals(pay),a=load(ACCOUNT_KEY,null);try{const d=await lfFetch('/api/orders',{method:'POST',body:JSON.stringify({userId,name,phone,contact:phone,city,address,customerName:name,customerPhone:phone,shippingAddress:`${city} - ${address}`,customer:{name,contact:phone,phone,address:`${city} - ${address}`,city,gender:a?.gender,age:a?.age},paymentMethod:pay,shippingRegion:totals.shippingRegion,shipping:totals.shippingFee,packaging:totals.packagingTotal,couponCode:totals.coupon?.code||null,pointsToRedeem:totals.pointsRedeemed||0,items:items.map(i=>({productId:String(i.productId),variantId:i.variantId||null,variantName:i.variant||null,packagingId:i.packagingId||null,quantity:i.qty}))})});cart=[];save('lf_cart',cart);await lfClearCartHeartbeat();couponCode='';localStorage.removeItem('lf_coupon');clearCheckoutDraft();await lfSyncProducts();await lfSyncMyOrders();renderCart();updateCount();document.getElementById('drawer').style.display='block';document.getElementById('checkout').innerHTML=customerOrderSuccessHtml(d.orderId||d.order?.id||'',pay)}catch(e){alert('تعذر تنفيذ الطلب: '+e.message);await lfSyncProducts()}};
async function lfSyncStoreSettings(){
  try{const d=await lfFetch('/api/settings'); const st=d.settings||{};
    if(st.cats&&typeof st.cats==='object'){cats=st.cats;save('lf_cats',cats)}
    if(st.brands&&typeof st.brands==='object'){brands=st.brands;save('lf_brands',brands)}
    if(st.hero&&typeof st.hero==='object'){heroSettings=st.hero;save('lf_hero',heroSettings)}
    if(st.store_logo&&typeof st.store_logo==='string'){
      const currentHero=load('lf_hero',DEFAULT_HERO)||DEFAULT_HERO;
      heroSettings={...currentHero,logo:st.store_logo};
      save('lf_hero',heroSettings);
    }
    if(typeof st.store_description==='string'){applyStoreDescription(st.store_description);save('lf_store_description',String(st.store_description).trim().slice(0,80));}
    if(Array.isArray(st.hero_slides))save('lf_hero_slides',st.hero_slides);
    if(st.feature_carousels)save('lf_feature_carousels',st.feature_carousels);
    if(st.hero_text_style&&typeof st.hero_text_style==='object')save('lf_hero_text_style',st.hero_text_style);
    if(st.social_links&&typeof st.social_links==='object')save('lf_social_links',st.social_links);
    if(Array.isArray(st.packaging_options))save('lf_packaging_options',st.packaging_options);
    storefrontGeneralMessage=normalizeStorefrontPublicMessage(st.storefront_general_message);
    save('lf_storefront_general_message',storefrontGeneralMessage);
    storeMaintenanceState={
      active:st.maintenance_mode===true,
      message:String(st.maintenance_message||'المتجر متوقف مؤقتًا للصيانة. سنعود قريبًا.')
    };
    save('lf_maintenance_state',storeMaintenanceState);
    renderStoreTopBar();
    renderMaintenanceMode();
    storeCommerceSettings.visaDiscountPercent=Math.min(100,Math.max(0,Number(st.visa_discount_percent)||0));
    const shippingFees=st.shipping_fees&&typeof st.shipping_fees==='object'?st.shipping_fees:{};
    storeCommerceSettings.shippingFees={
      westbank:Math.max(0,Number(shippingFees.westbank??20)||0),
      jerusalem:Math.max(0,Number(shippingFees.jerusalem??35)||0),
      inside:Math.max(0,Number(shippingFees.inside??70)||0)
    };
    const shippingDiscounts=st.shipping_discount_percentages&&typeof st.shipping_discount_percentages==='object'?st.shipping_discount_percentages:{};
    storeCommerceSettings.shippingDiscountPercentages={
      westbank:Math.min(100,Math.max(0,Number(shippingDiscounts.westbank)||0)),
      jerusalem:Math.min(100,Math.max(0,Number(shippingDiscounts.jerusalem)||0)),
      inside:Math.min(100,Math.max(0,Number(shippingDiscounts.inside)||0))
    };
    storeCommerceSettings.whatsappNumber=String(st.whatsapp_number||st.whatsapp||storeCommerceSettings.whatsappNumber||'00972562499924');
    DEFAULT_SOCIAL_LINKS.whatsapp.url=storeWhatsAppHref();
    updateStoreWhatsAppLinks();
    renderSocialLinks();
    heroIndex=0;renderHero();renderHeroSlider();restartHeroTimer();renderCats();renderProducts();renderFeatureSections();
  }catch(e){console.warn('API settings unavailable',e.message)}
}
window.addEventListener('storage',event=>{
  if(event.key!=='lf_hero_slides'||!event.newValue)return;
  try{
    const slides=JSON.parse(event.newValue);
    if(!Array.isArray(slides))return;
    save('lf_hero_slides',slides);
    heroIndex=0;renderHero();renderHeroSlider();restartHeroTimer();
  }catch(error){console.warn('Unable to refresh hero slides',error)}
});
async function lfSyncCatalog(){
  try{
    const [cd,bd]=await Promise.all([lfFetch('/api/categories'),lfFetch('/api/brands')]);
    if(Array.isArray(cd.categories)){
      const next={};
      cd.categories.forEach(c=>{const name=String(c.name||'').trim();if(name)next[name]={ar:name,en:name,icon:'🛍️',image:c.imageUrl||c.image_url||''};});
      cats=next; save('lf_cats',cats);
    }
    if(Array.isArray(bd.brands)){
      const next={};
      bd.brands.forEach(b=>{const name=String(b.name||'').trim();if(name)next[name]={ar:name,en:name,logo:b.logoUrl||b.logo_url||''};});
      brands=next; save('lf_brands',brands);
    }
    renderCats();renderProducts();renderFeatureSections();
  }catch(e){
    console.warn('API catalog unavailable',e.message);
    const nextCats={}; const nextBrands={};
    (products||[]).forEach(p=>{const c=String(p.cat||'').trim();if(c&&!nextCats[c])nextCats[c]={ar:c,en:c,icon:p.icon||'🛍️',image:''};const b=String(p.brand||'').trim();if(b&&!nextBrands[b])nextBrands[b]={ar:b,en:b,logo:''};});
    cats=nextCats;brands=nextBrands;save('lf_cats',cats);save('lf_brands',brands);renderCats();renderProducts();
  }
}

setInterval(()=>lfCartHeartbeat(),30*60*1000);
let nayaBodyProfile=null;
function openNayaBodyProfile(){const p=document.getElementById('nayaBodyPanel');if(!p)return;p.classList.add('open');p.setAttribute('aria-hidden','false');const c=document.getElementById('nayaBodyConsent');if(c)c.checked=!!nayaBodyProfile;if(nayaBodyProfile){['height','weight','bust','waist','hips'].forEach(k=>{const el=document.getElementById('naya'+k.charAt(0).toUpperCase()+k.slice(1));if(el)el.value=nayaBodyProfile[k]||''});renderNayaBodyPreview()} }
function closeNayaBodyProfile(){const p=document.getElementById('nayaBodyPanel');if(!p)return;p.classList.remove('open');p.setAttribute('aria-hidden','true')}
function nayaBodyScale(profile){const h=Number(profile.height)||165,w=Number(profile.weight)||65,b=Number(profile.bust)||0,wa=Number(profile.waist)||0,hip=Number(profile.hips)||0;const bmi=w/Math.pow(h/100,2);let width=0.92+(Math.max(17,Math.min(34,bmi))-17)*0.017;if(b&&hip){const shape=Math.max(b,hip)/Math.max(70,wa||80);width+=Math.max(-0.08,Math.min(0.12,(shape-1.25)*0.12))}width=Math.max(.82,Math.min(1.22,width));const heightScale=Math.max(.88,Math.min(1.10,h/165));return {width,height:heightScale}}
function renderNayaBodyPreview(){const img=document.getElementById('nayaBodyImage'),copy=document.querySelector('.naya-preview-copy span');if(!img||!nayaBodyProfile)return;const s=nayaBodyScale(nayaBodyProfile);img.style.transform=`scaleX(${s.width.toFixed(3)}) scaleY(${s.height.toFixed(3)})`;if(copy)copy.textContent=`${nayaBodyProfile.height} سم • ${nayaBodyProfile.weight} كغ • معاينة تقريبية`;const panel=document.getElementById('nayaTryOnPreview');if(panel)panel.dataset.profile='active'}
function clearNayaBodyProfile(){nayaBodyProfile=null;['height','weight','bust','waist','hips'].forEach(k=>{const el=document.getElementById('naya'+k.charAt(0).toUpperCase()+k.slice(1));if(el)el.value=''});const c=document.getElementById('nayaBodyConsent');if(c)c.checked=false;const img=document.getElementById('nayaBodyImage');if(img)img.style.transform='';const copy=document.querySelector('.naya-preview-copy span');if(copy)copy.textContent='أدخلي المقاسات لتظهر المعاينة';const panel=document.getElementById('nayaTryOnPreview');if(panel)delete panel.dataset.profile;nayaAddMessage('تم مسح بيانات المقاسات من ذاكرة الصفحة 🗑️',false)}
function saveNayaBodyProfile(){const consent=document.getElementById('nayaBodyConsent')?.checked;if(!consent)return alert('لازم توافقِي أولًا على رسالة الخصوصية لاستخدام المقاسات مؤقتًا.');const height=Number(document.getElementById('nayaHeight')?.value||0),weight=Number(document.getElementById('nayaWeight')?.value||0),bust=Number(document.getElementById('nayaBust')?.value||0),waist=Number(document.getElementById('nayaWaist')?.value||0),hips=Number(document.getElementById('nayaHips')?.value||0);if(height<120||height>220||weight<30||weight>250)return alert('أدخلي الطول والوزن ضمن القيم الصحيحة.');nayaBodyProfile={height,weight,bust:bust||null,waist:waist||null,hips:hips||null,createdAt:Date.now()};renderNayaBodyPreview();nayaAddMessage('تمام 🌸 طبّقتُ المقاسات على شكل نايا كتقريب بصري. بياناتك بقيت في ذاكرة الصفحة فقط ولم تُحفظ في الحساب أو قاعدة البيانات.','naya');}
window.addEventListener('beforeunload',()=>{nayaBodyProfile=null});
let nayaScrollY=0;
function openNaya(){const assistant=document.getElementById('nayaAssistant');if(!assistant)return;nayaScrollY=window.scrollY||0;document.body.style.top='-'+nayaScrollY+'px';assistant.classList.add('open');document.documentElement.classList.add('naya-locked');document.body.classList.add('naya-open')}
function closeNaya(){const assistant=document.getElementById('nayaAssistant');if(!assistant)return;assistant.classList.remove('open');document.documentElement.classList.remove('naya-locked');document.body.classList.remove('naya-open');document.body.style.top='';window.scrollTo(0,nayaScrollY||0)}
let nayaCurrentAudio=null,nayaCurrentAudioUrl='',nayaCurrentSpeechButton=null;
function stopNayaAudio(){if(nayaCurrentAudio){nayaCurrentAudio.pause();nayaCurrentAudio=null}if(nayaCurrentAudioUrl){URL.revokeObjectURL(nayaCurrentAudioUrl);nayaCurrentAudioUrl=''}if(nayaCurrentSpeechButton){nayaCurrentSpeechButton.disabled=false;nayaCurrentSpeechButton.textContent='🔊 استمعي للرد • صوت ذكاء اصطناعي';nayaCurrentSpeechButton=null}}
async function nayaSpeak(text,button){if(!button||button.dataset.loading==='true')return;stopNayaAudio();button.dataset.loading='true';button.disabled=true;button.textContent='جارٍ تجهيز الصوت...';try{const response=await fetch('/api/ai/tts',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({text:String(text||'').slice(0,1200)})});if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.message||'تعذر تشغيل صوت نايا الآن.')}nayaCurrentAudioUrl=URL.createObjectURL(await response.blob());nayaCurrentAudio=new Audio(nayaCurrentAudioUrl);nayaCurrentSpeechButton=button;button.disabled=false;button.textContent='🔊 نايا تتحدث...';await new Promise((resolve,reject)=>{nayaCurrentAudio.addEventListener('ended',resolve,{once:true});nayaCurrentAudio.addEventListener('error',()=>reject(new Error('تعذر تشغيل الصوت.')),{once:true});nayaCurrentAudio.play().catch(reject)})}catch(error){if(typeof nayaAddMessage==='function')nayaAddMessage(error.message||'تعذر تشغيل صوت نايا الآن.',false)}finally{if(nayaCurrentSpeechButton===button)stopNayaAudio();button.dataset.loading='false';button.disabled=false}}
function nayaAddMessage(text,user=false){const box=document.getElementById('nayaConversation');if(!box)return;const div=document.createElement('div');div.className='naya-message '+(user?'user':'naya');div.textContent=text;if(!user){const listen=document.createElement('button');listen.type='button';listen.className='naya-speak';listen.textContent='🔊 استمعي للرد • صوت ذكاء اصطناعي';listen.setAttribute('aria-label','استمعي لرد نايا. الصوت مولّد بالذكاء الاصطناعي.');listen.addEventListener('click',()=>nayaSpeak(text,listen));div.appendChild(listen)}box.appendChild(div);box.scrollTop=box.scrollHeight;return div}
let nayaAiHistory=[];
function nayaAppendRecommendations(items,node){if(!Array.isArray(items)||!items.length||!node)return;const box=document.createElement('div');box.className='naya-recommendations';items.slice(0,3).forEach(item=>{const btn=document.createElement('button');btn.type='button';btn.dataset.nayaProductId=String(item.id);btn.textContent=`${item.name} — ${Number(item.price)||0} ₪`;box.appendChild(btn)});node.appendChild(box);box.addEventListener('click',e=>{const button=e.target.closest('[data-naya-product-id]');if(button&&Number.isSafeInteger(Number(button.dataset.nayaProductId))&&typeof openProduct==='function')openProduct(Number(button.dataset.nayaProductId))})}
function nayaLocalAnswer(q){const t=String(q||'').trim().toLowerCase();if(/(?:طولي|وزني|خصري|صدري|أردافي|مقاساتي|قياساتي|\\b(?:height|weight|waist|bust|hips)\\b).{0,12}\\d+/i.test(t))return{reply:'خلّينا نحافظ على خصوصية قياساتك 🌸 أدخليها فقط في لوحة المقاسات بعد الموافقة؛ لن أرسلها للمساعد الذكي.',recommendations:[]};if(/\\b(cart|basket)\\b|سلة/.test(t))return{reply:`عندكِ حاليًا ${cart.reduce((n,i)=>n+(Number(i.qty)||0),0)} قطعة في السلة 🛍️`+(cart.length?' ويمكنكِ فتحها من زر السلة.':'، والسلة فارغة حاليًا.'),recommendations:[]};if(/مفضلة|المفضلة|favorite/.test(t))return{reply:`عندكِ ${getFavorites().length} منتج في المفضلة ❤️`,recommendations:[]};if(/مقاساتي|مقاسات|قياسات|جرّبيها على نايا|جربيها على نايا/.test(t)){openNayaBodyProfile();return{reply:'أكيد 🌸 افتحي لوحة المقاسات ووافقي على رسالة الخصوصية، وبعدها أعطيكِ معاينة تقريبية على نايا.',recommendations:[]}}return null}
const NAYA_PROFILE_AI_CONSENT_KEY='lf_naya_profile_ai_consent';
function nayaExplicitGiftRequest(q){
  const text=String(q||'').toLowerCase();
  return /(هدية|هديه|لأمي|لامي|لأختي|لاختي|لصديقتي|لصديقي|لشخص ثاني|لشخص تاني|لحدا ثاني|لحدا تاني|لغيري)/.test(text)&&!/(لنفسي|الي|إلي|لنفسى)/.test(text);
}
function nayaExplicitSelfRecommendation(q){
  const text=String(q||'').toLowerCase();
  const asksForAdvice=/(اقترح|اقتراح|تنصح|ترشيح|تجميعة|مجموعة|عطر|عطور|مكياج|اكسسوار|شنطة|منتج|يناسبني|تناسبني|بناسبني)/.test(text);
  const forSelf=/(لنفسي|نفسي|الي|إلي|يناسبني|تناسبني|بناسبني|ذوقي|لاستخدامي|لي أنا|إلي أنا)/.test(text);
  const giftHistory=nayaAiHistory.filter(x=>x.role==='user').slice(-4).map(x=>x.content).join(' ');
  return asksForAdvice&&forSelf&&!nayaExplicitGiftRequest(q)&&!nayaExplicitGiftRequest(giftHistory);
}
function nayaCustomerProfileForAi(q){
  if(!nayaExplicitSelfRecommendation(q)||typeof getAccount!=='function'||typeof lfToken!=='function'||!lfToken())return null;
  const account=getAccount();
  if(!account)return null;
  const profile={};
  const age=Number(account.age),gender=String(account.gender||'').trim().toLowerCase();
  if(Number.isInteger(age)&&age>=13&&age<=120)profile.age=age;
  if(['female','male'].includes(gender))profile.gender=gender;
  if(!Object.keys(profile).length)return null;
  let consent=null;
  try{consent=sessionStorage.getItem(NAYA_PROFILE_AI_CONSENT_KEY)}catch{}
  if(consent!=='yes'&&consent!=='no'){
    consent=window.confirm('لتخصيص الاقتراحات إلك، ستستخدم نايا العمر والجنس المحفوظين في حسابك، وسيُرسلان إلى مزوّد الذكاء الاصطناعي OpenAI. لن تُرسل بيانات التواصل أو قياسات الجسم. هل توافق على استخدامها؟')?'yes':'no';
    try{sessionStorage.setItem(NAYA_PROFILE_AI_CONSENT_KEY,consent)}catch{}
  }
  return consent==='yes'?profile:null;
}
async function nayaAnswer(q){const local=nayaLocalAnswer(q);if(local)return{...local,_local:true};const customerProfile=nayaCustomerProfileForAi(q);const response=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({message:q,history:nayaAiHistory.slice(-8),...(customerProfile?{customerProfile}:{})})});const result=await response.json().catch(()=>({}));if(!response.ok||!result.ok)throw new Error(result.message||'نايا الذكية غير متاحة الآن. جربي بعد شوي.');return{reply:String(result.reply||'كيف أقدر أساعدكِ؟'),recommendations:Array.isArray(result.recommendations)?result.recommendations:[]}}
async function sendNaya(){const input=document.getElementById('nayaInput');if(!input||input.dataset.sending==='true')return;const q=input.value.trim();if(!q)return;input.value='';input.dataset.sending='true';nayaAddMessage(q,true);try{const result=await nayaAnswer(q),node=nayaAddMessage(result.reply,false);if(!result._local){nayaAiHistory.push({role:'user',content:q},{role:'assistant',content:result.reply});nayaAiHistory=nayaAiHistory.slice(-8)}nayaAppendRecommendations(result.recommendations,node)}catch(error){nayaAddMessage(error.message||'تعذر الاتصال بنايا الآن. جربي بعد شوي.',false)}finally{input.dataset.sending='false';input.focus()}}
function nayaQuick(text){const input=document.getElementById('nayaInput');if(input){input.value=text;sendNaya()}}
let storefrontAnnouncementPoll=null;
async function refreshStorefrontAnnouncement(){
  try{
    const response=await fetch('/api/settings',{cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json();
    if(data.ok===false)return;
    const next=normalizeStorefrontPublicMessage(data.settings?.storefront_general_message);
    if(next.active!==storefrontGeneralMessage.active||next.message!==storefrontGeneralMessage.message){
      storefrontGeneralMessage=next;
      save('lf_storefront_general_message',next);
      renderStoreTopBar();
    }
  }catch{}
}
window.addEventListener('DOMContentLoaded',async()=>{await lfSyncStoreSettings();if(!storefrontAnnouncementPoll)storefrontAnnouncementPoll=window.setInterval(refreshStorefrontAnnouncement,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshStorefrontAnnouncement()});await lfSyncMe();await lfLoadLoyalty();await lfSyncProducts();await lfSyncAccountState();await lfSyncCatalog();await lfSyncMyOrders();renderAccountContent();initCountrySelectors();updateAccountBadge();restartFeatureAuto();await openPublicOrderFromUrl()});


/* Full-screen product image viewer with tap, pinch and drag zoom for mobile. */
(()=>{
  const zoomStyle=document.createElement('style');zoomStyle.id='lfImageZoomRuntimeStyle';zoomStyle.textContent=".lfImageZoom{position:fixed;inset:0;z-index:10000;display:none;grid-template-rows:auto minmax(0,1fr) auto;padding:calc(10px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));background:rgba(25,18,25,.97);color:#fff;direction:rtl}.lfImageZoom.open{display:grid}.lfImageZoom__bar{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:48px}.lfImageZoom__bar button{min-width:44px;min-height:42px;padding:7px 14px;border:1px solid rgba(255,255,255,.28);border-radius:24px;background:rgba(255,253,250,.13);color:#fff;font:inherit;font-size:17px}.lfImageZoom__close{font-size:28px!important;line-height:1}.lfImageZoom__stage{min-height:0;display:grid;place-items:center;overflow:hidden}.lfImageZoom__image{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-user-drag:none;transform-origin:center center;cursor:grab;will-change:transform}.lfImageZoom__hint{padding:10px 4px 2px;text-align:center;color:#f3e7ef;font-size:13px;line-height:1.6}html.lf-image-zoom-open,body.lf-image-zoom-open{overflow:hidden!important;overscroll-behavior:none!important}#mainProductImg{cursor:zoom-in}@media(max-width:600px){.lfImageZoom{padding-right:10px;padding-left:10px}.lfImageZoom__hint{font-size:12px}}";document.head.appendChild(zoomStyle);
  const overlay=document.createElement('div');
  overlay.id='lfImageZoom';
  overlay.className='lfImageZoom';
  overlay.setAttribute('aria-label','تكبير صورة المنتج');
  overlay.innerHTML='<div class="lfImageZoom__bar"><button type="button" class="lfImageZoom__close" aria-label="إغلاق الصورة">×</button><button type="button" class="lfImageZoom__toggle" aria-label="تكبير الصورة">＋ تكبير</button></div><div class="lfImageZoom__stage"><img class="lfImageZoom__image" alt="صورة المنتج" draggable="false"></div><div class="lfImageZoom__hint">قرّبي بإصبعين أو اضغطي مرتين للتكبير، واسحبي الصورة للتحريك</div>';
  document.body.appendChild(overlay);
  const image=overlay.querySelector('.lfImageZoom__image');
  const toggle=overlay.querySelector('.lfImageZoom__toggle');
  let scale=1,moveX=0,moveY=0,pointers=new Map(),pinchDistance=0,pinchScale=1,dragStart=null,lastTap=0;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function paint(){
    image.style.transform='translate3d('+moveX+'px,'+moveY+'px,0) scale('+scale+')';
    toggle.textContent=scale>1.05?'− تصغير':'＋ تكبير';
    toggle.setAttribute('aria-label',scale>1.05?'تصغير الصورة':'تكبير الصورة');
  }
  function reset(){scale=1;moveX=0;moveY=0;pointers.clear();paint()}
  function close(){overlay.classList.remove('open');document.documentElement.classList.remove('lf-image-zoom-open');document.body.classList.remove('lf-image-zoom-open');reset()}
  function open(src,alt){
    image.src=src;image.alt=alt||'صورة المنتج';reset();overlay.classList.add('open');document.documentElement.classList.add('lf-image-zoom-open');document.body.classList.add('lf-image-zoom-open');
  }
  document.addEventListener('click',event=>{
    const source=event.target.closest&&event.target.closest('#modalBody img');
    if(source){
      event.preventDefault();event.stopPropagation();
      if(source.closest('.thumbs')&&typeof pickImg==='function')pickImg(source,source.currentSrc||source.src);
      open(source.currentSrc||source.src,source.alt||'صورة المنتج');return;
    }
    if(event.target===overlay||event.target.closest('.lfImageZoom__close'))close();
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&overlay.classList.contains('open'))close();
    const target=event.target;
    if((event.key==='Enter'||event.key===' ')&&target&&target.id==='mainProductImg'){event.preventDefault();open(target.currentSrc||target.src,target.alt)}
  });
  toggle.addEventListener('click',()=>{if(scale>1.05){reset()}else{scale=2;moveX=0;moveY=0;paint()}});
  image.addEventListener('dblclick',event=>{event.preventDefault();if(scale>1.05)reset();else{scale=2;paint()}});
  const distance=()=>{const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};
  image.addEventListener('pointerdown',event=>{
    if(!overlay.classList.contains('open'))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    try{image.setPointerCapture(event.pointerId)}catch{}
    if(pointers.size===2){pinchDistance=distance();pinchScale=scale;dragStart=null}
    else if(pointers.size===1)dragStart={x:event.clientX,y:event.clientY,moveX,moveY};
  });
  image.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size>=2&&pinchDistance){scale=clamp(pinchScale*(distance()/pinchDistance),1,4);if(scale===1){moveX=0;moveY=0}paint()}
    else if(scale>1.05&&dragStart){moveX=dragStart.moveX+event.clientX-dragStart.x;moveY=dragStart.moveY+event.clientY-dragStart.y;paint()}
  });
  const endPointer=event=>{
    pointers.delete(event.pointerId);
    if(pointers.size<2)pinchDistance=0;
    if(pointers.size===1){const p=[...pointers.values()][0];dragStart={x:p.x,y:p.y,moveX,moveY}}
    else dragStart=null;
  };
  image.addEventListener('pointerup',endPointer);image.addEventListener('pointercancel',endPointer);image.addEventListener('lostpointercapture',endPointer);
})();


/* Reliable mobile navigation and iPhone-style swipe dismissal. */
(()=>{
 const nav=document.querySelector('.bottomNav');
 nav?.addEventListener('click',event=>{const button=event.target.closest('[data-bottom-action]');if(!button)return;event.preventDefault();event.stopPropagation();const closeLayers=()=>{closeQuickSearch();closeCart();closeAccount();closeOrderDetail();closePolicy();closeModal();if(document.getElementById('sideMenuOverlay')?.classList.contains('open'))toggleSideMenu();if(document.getElementById('nayaAssistant')?.classList.contains('open'))closeNaya()};switch(button.dataset.bottomAction){case 'home':closeLayers();goHome();break;case 'categories':closeLayers();document.getElementById('cats')?.scrollIntoView({behavior:'smooth',block:'start'});break;case 'cart':closeLayers();openCart();break;case 'search':closeLayers();openQuickSearch('bottom');break}});
 let start=null;
 const surfaceFor=target=>{if(target.closest('.quickSearchDialog'))return {el:document.getElementById('quickSearchOverlay'),kind:'quickSearch'};if(target.closest('.sideMenu'))return {el:document.getElementById('sideMenuOverlay'),kind:'side'};if(target.closest('.panel'))return {el:document.getElementById('drawer'),kind:'cart'};if(target.closest('.productModal'))return {el:document.getElementById('modal'),kind:'product'};if(target.closest('#accountModal .modalBox'))return {el:document.getElementById('accountModal'),kind:'account'};if(target.closest('#orderDetailModal .modalBox'))return {el:document.getElementById('orderDetailModal'),kind:'order'};if(target.closest('#policyModal .modalBox'))return {el:document.getElementById('policyModal'),kind:'policy'};if(target.closest('.naya-assistant'))return {el:document.getElementById('nayaAssistant'),kind:'naya'};return null};
 const visible=s=>{if(!s?.el)return false;if(s.kind==='side')return s.el.classList.contains('open');if(s.kind==='quickSearch')return s.el.classList.contains('open');if(s.kind==='naya')return s.el.classList.contains('open')||getComputedStyle(s.el).display!=='none';return getComputedStyle(s.el).display!=='none'};
 document.addEventListener('touchstart',event=>{const target=event.target;if(!(target instanceof Element))return;const s=surfaceFor(target);if(!visible(s))return;const box=s.kind==='quickSearch'?s.el.querySelector('.quickSearchDialog'):s.kind==='side'?s.el.querySelector('.sideMenu'):s.kind==='cart'?s.el.querySelector('.panel'):s.kind==='product'?s.el.querySelector('.productModal'):s.kind==='naya'?s.el:s.el.querySelector('.modalBox');if(!box)return;const r=box.getBoundingClientRect(),touch=event.touches[0],inHandle=touch.clientY-r.top<=76,inHeader=!!target.closest('.close,.sideClose,.naya-header,.orderDetailHead');if(!inHandle&&!inHeader)return;if(target.closest('input,textarea,select,button:not(.close):not(.sideClose)'))return;start={kind:s.kind,x:touch.clientX,y:touch.clientY}},{passive:true});
 document.addEventListener('touchend',event=>{if(!start)return;const touch=event.changedTouches[0],dx=touch.clientX-start.x,dy=touch.clientY-start.y,kind=start.kind;start=null;if(kind==='quickSearch'&&dy>75&&dy>Math.abs(dx)*1.25){closeQuickSearch();return}if(kind==='side'&&Math.abs(dx)>75&&Math.abs(dx)>Math.abs(dy)*1.25){toggleSideMenu();return}if(dy>75&&dy>Math.abs(dx)*1.25){if(kind==='cart')closeCart();else if(kind==='product')closeModal();else if(kind==='account')closeAccount();else if(kind==='order')closeOrderDetail();else if(kind==='policy')closePolicy();else if(kind==='naya')closeNaya();else if(kind==='side')toggleSideMenu()}},{passive:true});
})();

// A horizontal swipe changes slides; vertical gestures remain normal page scrolling.
(()=>{
 const card=document.querySelector('.heroSlider .heroCard');if(!card)return;
 let start=null,swiped=false;
 card.style.touchAction='pan-y';
 card.addEventListener('pointerdown',e=>{if(e.target.closest('button,a,input')||!e.isPrimary)return;start={id:e.pointerId,x:e.clientX,y:e.clientY};swiped=false;pauseHeroTimer();if(e.pointerType==='mouse')card.setPointerCapture(e.pointerId)});
 card.addEventListener('pointerup',e=>{if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){swiped=true;heroMove(dx<0?1:-1)}else resumeHeroTimer()});
 card.addEventListener('pointercancel',()=>{start=null;resumeHeroTimer()});
 card.addEventListener('click',e=>{if(swiped){e.preventDefault();e.stopPropagation();swiped=false}},true);
 card.querySelectorAll('img').forEach(img=>img.draggable=false);
})();
// Lock the document at its current scroll position while any store dialog is open.
(()=>{
 let locked=false,scrollY=0,previous={};
 const ids=['modal','drawer','accountModal','orderDetailModal','policyModal','quickSearchOverlay','sideMenuOverlay','nayaAssistant'];
 const isOpen=el=>el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&(el.classList.contains('open')||el.style.display==='flex'||el.style.display==='block');
 function sync(){const open=ids.some(id=>isOpen(document.getElementById(id)))||!!document.querySelector('.lf-idea-modal[aria-hidden="false"],.lfImageZoom.open');
 if(open&&!locked){scrollY=window.scrollY;previous={position:document.body.style.position,top:document.body.style.top,width:document.body.style.width};locked=true;document.body.classList.add('lf-dialog-locked');Object.assign(document.body.style,{position:'fixed',top:`-${scrollY}px`,width:'100%'});}
 else if(!open&&locked){locked=false;document.body.classList.remove('lf-dialog-locked');Object.assign(document.body.style,previous);window.scrollTo(0,scrollY)}}
 const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style','aria-hidden'],childList:true});sync();
})();
