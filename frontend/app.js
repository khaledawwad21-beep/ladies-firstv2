
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
let storeCommerceSettings={visaDiscountPercent:0,whatsappNumber:'0562499924',shippingFees:{westbank:20,jerusalem:35,inside:70}};
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
function jsAttr(value){return esc(JSON.stringify(String(value??'')))}
function renderHero(){heroSettings=load('lf_hero',DEFAULT_HERO)||DEFAULT_HERO;const logo=document.getElementById('logo'),hero=document.getElementById('heroLogo'),side=document.getElementById('sideLogo');if(logo){logo.src=safeImg(heroSettings.logo);logo.onerror=()=>{logo.onerror=null;logo.src=LOGO}}if(hero){hero.src=safeImg(heroSettings.image);hero.onerror=()=>{hero.onerror=null;hero.src=LOGO}}if(side){side.src=safeImg(heroSettings.logo);side.onerror=()=>{side.onerror=null;side.src=LOGO}}}
function renderCats(){const keys=Object.keys(cats);const countBy={};products.forEach(p=>countBy[p.cat]=(countBy[p.cat]||0)+1);const catsEl=document.getElementById('cats');if(catsEl)catsEl.innerHTML=keys.map(k=>{const c=cats[k]||{};return `<button class="cat" onclick="setCat(${jsAttr(k)})"><img src="${safeImg(c.image,LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"><label>${esc(currentLang==='en'?(c.en||c.ar||k):(c.ar||k))}</label></button>`}).join('');const filter=document.getElementById('filter');if(filter)filter.innerHTML=`<option value="">${currentLang==='en'?'All categories':'كل الفئات'}</option>`+keys.map(k=>`<option value="${esc(k)}">${esc(currentLang==='en'?(cats[k]?.en||cats[k]?.ar||k):(cats[k]?.ar||k))}</option>`).join('');const bf=document.getElementById('brandFilter');if(bf)bf.innerHTML=`<option value="">${currentLang==='en'?'All brands':'كل البراندات'}</option>`+Object.keys(brands).map(k=>`<option value="${esc(k)}">${esc(currentLang==='en'?(brands[k]?.en||brands[k]?.ar||k):(brands[k]?.ar||k))}</option>`).join('');const side=document.getElementById('sideCats');if(side)side.innerHTML=keys.map(k=>{const c=cats[k]||{};return `<button class="sideCat" onclick="setCat(${jsAttr(k)});toggleSideMenu()"><img src="${safeImg(c.image,LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"><b>${esc(currentLang==='en'?(c.en||c.ar||k):(c.ar||k))}</b><span>${countBy[k]||0}</span></button>`}).join('');const sideB=document.getElementById('sideBrands');if(sideB)sideB.innerHTML=Object.keys(brands).map(k=>{const b=brands[k]||{};const n=products.filter(p=>p.brand===k).length;return `<button class="sideCat" onclick="setBrand(${jsAttr(k)});toggleSideMenu()"><img src="${safeImg(b.image,LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"><b>${esc(currentLang==='en'?(b.en||b.ar||k):(b.ar||k))}</b><span>${n}</span></button>`}).join('')}
function setCat(c){document.getElementById('filter').value=c;const bf=document.getElementById('brandFilter');if(bf)bf.value='';document.getElementById('products').scrollIntoView({behavior:'smooth'});renderProducts()}
function setBrand(b){const bf=document.getElementById('brandFilter');if(bf)bf.value=b;const f=document.getElementById('filter');if(f)f.value='';document.getElementById('products').scrollIntoView({behavior:'smooth'});renderProducts()}
function variantList(p){return Array.isArray(p.variants)?p.variants.filter(v=>v&&String(v.name||'').trim()).map(v=>({name:String(v.name).trim(),stock:Math.max(0,Number(v.stock)||0)})):[]}
function totalStock(p){const vs=variantList(p);return vs.length?vs.reduce((a,v)=>a+v.stock,0):Math.max(0,Number(p.stock)||0)}
function selectedVariant(id){const el=document.getElementById('variant_'+id);return el?el.value:''}
function updateVariantCard(id){const p=products.find(x=>x.id===id);if(!p)return;const v=selectedVariant(id),stock=variantStock(p,v);const hint=document.getElementById('stockHint_'+id);if(hint)hint.textContent=`متوفر من اللون ${v}: ${stock}`;let low=document.getElementById('lowStock_'+id);if(stock>0&&stock<=3){if(!low){low=document.createElement('div');low.id='lowStock_'+id;low.className='lowStockAlert';const h=document.getElementById('stockHint_'+id);if(h)h.insertAdjacentElement('afterend',low)}low.textContent=lowStockMessage(stock)}else if(low)low.remove();const num=document.getElementById('qtyNum_'+id);const item=findCartItem(id,v);if(num)num.textContent=item?Number(item.qty)||0:0}
function renderVariantChooser(p){const vs=variantList(p);if(!vs.length)return '';return `<div class="variantBox"><div class="variantLabel">اختاري اللون</div><select class="variantSelect" id="variant_${p.id}" onchange="updateVariantCard(${p.id})">${vs.map(v=>`<option value="${esc(v.name)}" ${v.stock<=0?'disabled':''}>${esc(v.name)}${v.stock<=0?' — خلص':''} (${v.stock})</option>`).join('')}</select></div>`}
const LANG_KEY='lf_lang';
let currentLang=localStorage.getItem(LANG_KEY)||'ar';
function toggleLanguage(){currentLang=currentLang==='ar'?'en':'ar';localStorage.setItem(LANG_KEY,currentLang);document.documentElement.lang=currentLang;document.documentElement.dir=currentLang==='ar'?'rtl':'ltr';document.getElementById('lang').textContent=currentLang==='ar'?'EN':'عربي';renderStaticLang();renderNewUiLang();renderCats();renderProducts();renderFeatureSections();renderCart()}
function renderStaticLang(){const en=currentLang==='en';document.documentElement.lang=currentLang;document.documentElement.dir=en?'ltr':'rtl';document.getElementById('topBar').textContent=en?'Fast delivery across Palestine • Cash on delivery available':'توصيل سريع داخل فلسطين • الدفع عند الاستلام متاح';document.getElementById('heroTitle').textContent=en?'Everything you need.. in one place':'كل ما تحتاجينه.. في مكان واحد';document.getElementById('heroDesc').textContent=en?'Makeup, perfumes, watches and bags carefully selected to complete your look.':'مكياج، عطور، ساعات وشنط مختارة بعناية لتكملي إطلالتك.';document.getElementById('heroCta').textContent=en?'Shop now':'تسوقي الآن';document.querySelector('.sectionTitle h2').textContent=en?'Shop by category':'تسوقي حسب الفئة';document.getElementById('products').querySelector('h2').textContent=en?'Featured products':'منتجات مختارة';document.querySelector('.brand small').textContent='ONLINE STORE';document.getElementById('search').placeholder=en?'Search for a product...':'ابحثي عن منتج...';document.getElementById('cartTitle').textContent='🛍️ '+(en?'Shopping cart':'سلة التسوق');document.getElementById('whatsappFloat').querySelector('span').textContent=en?'WhatsApp':'واتساب';document.getElementById('footerTagline').textContent=en?'Everything you need.. in one place':'كل ما تحتاجينه.. في مكان واحد';document.getElementById('returnsBtn').textContent=en?'Exchange & Return Policy':'سياسة التبديل والإرجاع';document.getElementById('privacyBtn').textContent=en?'Privacy':'الخصوصية';const sb=document.getElementById('sideBrandsLabel');if(sb)sb.textContent=en?'Brands':'البراندات';const t5=document.getElementById('top5Title');if(t5)t5.textContent=en?'🔥 Top 5 Offers':'🔥 أقوى 5 عروض';const bs=document.getElementById('bestTitle');if(bs)bs.textContent=en?'🏆 Best Sellers':'🏆 الأكثر مبيعًا'}
let searchTimer;function queueSearchHistory(v){clearTimeout(searchTimer);searchTimer=setTimeout(()=>rememberSearch(v),700)}
function rememberSearch(v){const q=String(v||'').trim();if(q.length<2)return;let h=load('lf_search_history',[]);h=[q,...h.filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,5);save('lf_search_history',h);renderHistory()}
function renderHistory(){const h=load('lf_search_history',[]),el=document.getElementById('searchHistory');if(!el)return;el.innerHTML=h.length?h.map(x=>`<button class="historyChip" onclick="useHistory(${jsAttr(x)})">${esc(x)}</button>`).join(''):'';el.style.display=h.length?'flex':'none'}
function toggleHistory(){const el=document.getElementById('searchHistory');renderHistory();if(el)el.style.display=el.style.display==='none'?'flex':'none'}
function useHistory(x){document.getElementById('search').value=x;renderProducts()}
async function joinWaitlist(id){const p=products.find(x=>x.id===id);if(!p)return;const a=getAccount();const defaultName=a?.name||'';const defaultPhone=a?.phone||((a?.type==='whatsapp')?a.contact:'')||'';const name=prompt(currentLang==='en'?'Your name:':'اسمك:',defaultName);if(!name)return;const phone=prompt(currentLang==='en'?'WhatsApp number:':'رقم واتسابك:',defaultPhone);if(!phone)return;const variant=selectedVariant(id)||'';try{const d=await lfFetch('/api/waitlist',{method:'POST',body:JSON.stringify({productId:id,name,phone,variant})});alert(d.alreadyWaiting?(currentLang==='en'?'You are already on the availability list for this item.':'💕 سيدتي، طلبك موجود أصلًا في قائمة التوفر لهذا المنتج 🌸'):(currentLang==='en'?'You have been added to the availability list. We will contact you when it is available.':'💕 تم تسجيلك في قائمة التوفر. سنراسلك على واتساب عند توفره 🌸'))}catch(e){alert(e.message||'تعذر التسجيل في قائمة التوفر') }}
function openPolicy(type){const en=currentLang==='en';const text=type==='returns'?(en?'<h2>Exchange & Return Policy</h2><p>Please contact the store within 12 hours of receiving the order for exchange or return requests. The item must be unused and in its original condition and packaging. Clearance, opened cosmetics, and perfumes cannot be returned unless there is a defect.</p><p>Shipping/return costs are handled according to the reason for return and the store confirmation.</p>':'<h2>سياسة التبديل والإرجاع</h2><p>يرجى التواصل مع المتجر خلال 12 ساعة من استلام الطلب لطلبات التبديل أو الإرجاع. يجب أن يكون المنتج غير مستخدم وبحالته وتغليفه الأصليين. المنتجات المخفضة جدًا ومستحضرات التجميل والعطور المفتوحة لا تُرجع إلا في حال وجود عيب.</p><p>تكاليف الشحن أو الإرجاع تحدد حسب سبب الإرجاع وبعد تأكيد المتجر.</p>'):(en?'<h2>Privacy</h2><p>Your order information is used only to process and contact you about your order.</p>':'<h2>الخصوصية</h2><p>تُستخدم بيانات الطلب فقط لمعالجة الطلب والتواصل معك بخصوصه.</p>');document.getElementById('policyContent').innerHTML=text;document.getElementById('policyModal').style.display='flex'}
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
function openAccount(){document.getElementById('accountModal').style.display='flex';renderAccountContent()}
function closeAccount(){document.getElementById('accountModal').style.display='none'}
function getAccountOrders(){const a=getAccount();if(!a)return [];return load('lf_orders',[]).filter(o=>o.status!=='ملغي'&&(o.accountRef===a.contact||(a.type==='whatsapp'&&normalizePhone(o.phone)===normalizePhone(a.contact)))).slice(0,20)}
function publicOrderStatusLabel(status){return ({pending:'جديد',confirmed:'مؤكد',processing:'قيد التجهيز',shipped:'تم الشحن',delivered:'تم التسليم',completed:'مكتمل',cancelled:'ملغي'})[String(status||'').toLowerCase()]||String(status||'-')}
function publicOrderRegionLabel(region){return ({westbank:'الضفة',jerusalem:'القدس',inside:'الداخل'})[String(region||'').toLowerCase()]||String(region||'-')}
function publicOrderDetailsHtml(data){
  const o=data?.order||{},items=Array.isArray(data?.items)?data.items:[];
  const payment=String(o.paymentMethod||o.payment_method||'cash').toLowerCase()==='visa'?'Visa — لم يتم تحصيل المبلغ إلكترونياً':'الدفع عند الاستلام';
  const shipping=o.shippingWaived||o.shipping_waived?'معفى':Number(o.shipping??o.shipping_cost??0).toFixed(2)+' ₪';
  return `<div class="orderDetail"><div class="orderDetailHead"><b>تفاصيل الطلب #${Number(o.id)||''}</b><span>${o.createdAt||o.created_at?new Date(o.createdAt||o.created_at).toLocaleString('ar') : ''}</span></div><div class="notice">هذا الرابط يعرض تفاصيل الطلب بدون إظهار رقم الهاتف أو العنوان.</div><p><b>الحالة:</b> ${esc(publicOrderStatusLabel(o.status))}<br><b>طريقة الدفع:</b> ${esc(payment)}<br><b>منطقة التوصيل:</b> ${esc(publicOrderRegionLabel(o.shippingRegion||o.shipping_region))}</p><div class="orderItems">${items.map(it=>`<div class="orderItem">${it.image?`<img src="${esc(it.image)}" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:9px">`:''}<div><b>${esc(it.productName||it.product_name||'منتج')}</b>${(it.variantName||it.variant_name)?`<div>${esc(it.variantName||it.variant_name)}</div>`:''}</div><span>× ${Number(it.quantity)||0}</span><b>${Number(it.total||0).toFixed(2)} ₪</b></div>`).join('')||'<div class="empty">لا توجد تفاصيل منتجات.</div>'}</div><div class="orderSummary">المجموع الفرعي: ${Number(o.subtotal||0).toFixed(2)} ₪<br>خصم الكوبون: -${Number(o.couponDiscount??o.coupon_discount??0).toFixed(2)} ₪<br>خصم Visa: -${Number(o.visaDiscount??o.visa_discount??0).toFixed(2)} ₪<br>خصم الولاء: -${Number(o.loyaltyDiscount??o.loyalty_discount??0).toFixed(2)} ₪<br>التغليف: ${Number(o.packaging??o.packaging_cost??0).toFixed(2)} ₪<br>التوصيل: ${esc(shipping)}<br><b>الإجمالي: ${Number(o.total||0).toFixed(2)} ₪</b></div></div>`;
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
function orderDetailsHtml(o){const eligible=['delivered','completed'].includes(String(o.status||'').toLowerCase());const items=(o.items||[]).map(it=>`<div class="orderItem"><div><b>${esc(it.name||'منتج')}</b>${it.variant?`<div>اللون: ${esc(it.variant)}</div>`:''}</div><span>× ${Number(it.qty)||1}</span><b>${Number(it.price||it.lineTotal||0).toFixed(2)} ₪</b>${eligible&&it.orderItemId?`<button class="add" type="button" onclick="openReturnRequest(${o.id},${it.orderItemId},${Number(it.qty)||1},${jsAttr(it.name||'منتج')})">إرجاع / استبدال</button>`:''}</div>`).join('');return `<div class="orderDetail"><div class="orderDetailHead"><b>الطلب #${o.id}</b><span>${esc(o.date||'')}</span></div><div class="orderItems">${items||'<div class="empty">لا توجد تفاصيل.</div>'}</div>${eligible?'<div class="notice">سياسة الإرجاع/التبديل: خلال 12 ساعة من استلام الطلب.</div>':''}<div class="orderSummary">المجموع الفرعي: ${Number(o.subtotal||0).toFixed(2)} ₪<br>التوصيل: ${o.shippingWaived?'معفى':Number(o.shippingFee||0).toFixed(2)+' ₪'}<br><b>الإجمالي: ${Number(o.total||0).toFixed(2)} ₪</b></div>${returnHistoryHtml(o)}<button class="add" type="button" onclick="reorder(${o.id})">🔄 إعادة الطلب</button></div>`}
async function returnImageData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('تعذر قراءة الصورة'));r.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('تعذر قراءة الصورة'));img.onload=()=>{let w=img.width,h=img.height,k=Math.min(1,1200/Math.max(w,h));w=Math.round(w*k);h=Math.round(h*k);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',.72))};img.src=r.result};r.readAsDataURL(file)})}
function openReturnRequest(orderId,itemId,maxQty,name){const host=document.getElementById('orderDetailContent');if(!host)return;host.innerHTML=`<div class="orderDetail"><h3>إرجاع / استبدال — ${esc(name)}</h3><div class="notice">يمكن تقديم الطلب خلال 12 ساعة من الاستلام. الصور تساعد الإدارة على مراجعة الحالة.</div><label>نوع الطلب<select id="rrType" class="field"><option value="return">إرجاع</option><option value="exchange">استبدال</option></select></label><label>الكمية<input id="rrQty" class="field" type="number" min="1" max="${maxQty}" value="1"></label><label>السبب<select id="rrReason" class="field"><option value="">اختاري السبب</option><option value="store_damaged">المنتج تالف</option><option value="store_wrong_item">المنتج مختلف عن الطلب</option><option value="store_missing_item">يوجد نقص في الطلب</option><option value="customer_size_color">المقاس أو اللون غير مناسب</option><option value="customer_changed_mind">تغيير رأي</option><option value="other">سبب آخر</option></select></label><label>ملاحظات<textarea id="rrNotes" class="field" rows="3" placeholder="اشرحي الحالة باختصار"></textarea></label><label>صور الحالة — حتى 5 صور<input id="rrImages" class="field" type="file" accept="image/*" multiple></label><button class="add" onclick="submitReturnRequest(${orderId},${itemId},${maxQty})">إرسال الطلب</button><button type="button" onclick="viewOrder(${orderId})">رجوع</button></div>`}
async function submitReturnRequest(orderId,itemId,maxQty){if(!lfToken())return alert('سجلي الدخول أولًا لإرسال طلب الإرجاع أو الاستبدال');const quantity=Number(document.getElementById('rrQty')?.value||0),requestType=document.getElementById('rrType')?.value||'',reasonEl=document.getElementById('rrReason'),reasonCode=reasonEl?.value||'',reason=reasonEl?.selectedOptions?.[0]?.textContent?.trim()||'',notes=document.getElementById('rrNotes')?.value.trim()||'',files=[...(document.getElementById('rrImages')?.files||[])].slice(0,5);if(quantity<1||quantity>maxQty)return alert('الكمية غير صحيحة');if(!reasonCode)return alert('اختاري سبب الطلب');try{const images=[];for(const file of files)images.push(await returnImageData(file));const d=await lfFetch('/api/returns',{method:'POST',body:JSON.stringify({orderId,orderItemId:itemId,quantity,requestType,reasonCode,reason,notes,images})});alert(d.message||'تم إرسال الطلب للمراجعة');viewOrder(orderId)}catch(e){alert(e.message||'تعذر إرسال الطلب')}}
function viewOrder(id){const o=load('lf_orders',[]).find(x=>String(x.id)===String(id));if(!o)return;const m=document.getElementById('orderDetailModal');if(!m)return;document.getElementById('orderDetailContent').innerHTML=orderDetailsHtml(o);m.style.display='flex'}
function closeOrderDetail(){const m=document.getElementById('orderDetailModal');if(m)m.style.display='none';if(/^\/order\/\d+\/?$/.test(location.pathname))history.replaceState(null,'','/')}
function reorder(id){const o=load('lf_orders',[]).find(x=>String(x.id)===String(id));if(!o)return;let added=0,skipped=0;(o.items||[]).forEach(it=>{const p=products.find(x=>Number(x.id)===Number(it.productId));if(!p){skipped++;return}const available=variantStock(p,it.variant||'');const want=Math.max(1,Number(it.qty)||1);if(available<=0){skipped++;return}const qty=Math.min(want,available);addToCart(p.id,qty,it.variant||'',it.packagingId||'');added+=qty;if(qty<want)skipped++});closeOrderDetail();closeAccount();openCart();if(skipped)alert(`تمت إعادة إضافة ${added} قطعة 🌸\n${skipped} من القطع لم تعد متوفرة بالكمية المطلوبة.`)}
function renderSideAccountGreeting(){const el=document.getElementById('sideAccountGreeting');if(!el)return;const a=getAccount();el.innerHTML=a?`<div class="sideGreeting">${greetingForAccount(a)}، <b>${esc(a.name||'سيدتي')}</b> 🩷</div><button class="sideAccountBtn" onclick="openAccount();toggleSideMenu()">👤 حسابي وطلباتي</button>`:`<button class="sideAccountBtn" onclick="openAccount();toggleSideMenu()">👤 تسجيل الدخول الاختياري</button>`}
function localPhoneForAccount(a){const raw=String(a?.contact||'').trim();if(!raw)return '';const n=normalizePhone(raw,a?.countryIso||'PS');if(!n.startsWith('+'))return raw;const dial=String(COUNTRY_DIAL_CODES[a?.countryIso||'PS']||'');if(dial&&n.slice(1,1+dial.length)===dial)return '0'+n.slice(1+dial.length);return n.slice(1)}
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
    <h3 style="margin-top:16px">📋 مشترياتي السابقة</h3><div class="ordersList">${orders.length?orders.map(o=>`<div class="orderSummaryCard"><div><b>#${o.id}</b><br><small>${esc(o.date||'')}</small></div><div><b>${Number(o.total||0).toFixed(2)} ₪</b><br><small>${esc(o.status||'جديد')}</small></div><button type="button" onclick="viewOrder(${o.id})">التفاصيل</button></div>`).join(''):'<div class="empty">لا توجد طلبات محفوظة لهذا الحساب بعد.</div>'}</div>`;
  if(a.type==='whatsapp'){
    initCountrySelectors();
    const sel=document.getElementById('accountCountryEdit');
    if(sel){sel.value=a.countryIso||'PS';syncCountryDialPreview('accountCountryEdit','accountContactEdit')}
  }
  loadCustomerPasskeyStatus();
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
function bindFeatureCarousel(el){
  if(!el||el.dataset.carouselBound==='1')return;
  el.dataset.carouselBound='1';
  el.style.touchAction='pan-x pan-y';
  let down=false,startX=0,startScroll=0,moved=false;
  const start=e=>{const p=e.touches?e.touches[0]:e;down=true;moved=false;startX=p.clientX;startScroll=el.scrollLeft;el.classList.add('dragging');};
  const move=e=>{if(!down)return;const p=e.touches?e.touches[0]:e,dx=p.clientX-startX;if(Math.abs(dx)>7)moved=true;if(moved){el.scrollLeft=startScroll-dx;if(e.cancelable)e.preventDefault();}};
  const end=()=>{if(!down)return;down=false;el.classList.remove('dragging');if(moved){el.dataset.suppressClick='1';setTimeout(()=>delete el.dataset.suppressClick,120);}};
  el.addEventListener('pointerdown',start,{passive:true});
  el.addEventListener('pointermove',move,{passive:false});
  el.addEventListener('pointerup',end,{passive:true});
  el.addEventListener('pointercancel',end,{passive:true});
  el.addEventListener('touchstart',start,{passive:true});
  el.addEventListener('touchmove',move,{passive:false});
  el.addEventListener('touchend',end,{passive:true});
  el.addEventListener('click',e=>{if(el.dataset.suppressClick==='1'){e.preventDefault();e.stopPropagation();delete el.dataset.suppressClick;}},true);
}
function moveFeatureCarousel(id,dir){const el=document.getElementById(id);if(!el)return;const card=el.querySelector('.featureCard');const gap=parseInt(getComputedStyle(el).gap||'10',10)||10;const amount=(card?.getBoundingClientRect().width||190)+gap;el.scrollBy({left:dir*amount,behavior:'smooth'});}
function initFeatureCarousels(){bindFeatureCarousel(document.getElementById('top5Grid'));bindFeatureCarousel(document.getElementById('bestSellersGrid'));}
function autoFeatureCarousels(){['top5Grid','bestSellersGrid'].forEach(id=>{const el=document.getElementById(id);if(!el||el.scrollWidth<=el.clientWidth+5)return;const card=el.querySelector('.featureCard');const amount=(card?.getBoundingClientRect().width||190)+10;const max=el.scrollWidth-el.clientWidth;if(el.scrollLeft>=max-4)el.scrollTo({left:0,behavior:'smooth'});else el.scrollBy({left:amount,behavior:'smooth'});});}
let featureAutoTimer=null;
function restartFeatureAuto(){clearInterval(featureAutoTimer);featureAutoTimer=setInterval(autoFeatureCarousels,3500);}

function renderFeatureSections(){
  const t=document.getElementById('top5Grid'),b=document.getElementById('bestSellersGrid');
  if(!t||!b)return;
  const top=getTop5(),best=getBestSellers();
  t.innerHTML=top.length?top.map(p=>featureCardHtml(p)).join(''):'<div class="empty">لا توجد عروض حالياً</div>';
  b.innerHTML=best.length?best.map(x=>featureCardHtml(x.p,`<div class="soldCount">${currentLang==='en'?'Sold':'مباع'}: ${x.qty} ${window.LF_BEST_SELLERS_PERIOD==='week'?(currentLang==='en'?'in the last 7 days':'خلال آخر 7 أيام'):(currentLang==='en'?'all time':'خلال كل الفترة')}</div>`)).join(''):`<div class="empty">${bestSellersEmptyMessage()}</div>`;
  t.scrollLeft=0;b.scrollLeft=0;
  initFeatureCarousels();
  restartFeatureAuto();
  renderQuickOffers();
}
function renderProducts(){const q=(document.getElementById('search').value||'').toLowerCase(),f=document.getElementById('filter').value,bf=document.getElementById('brandFilter')?.value||'';const list=products.filter(p=>(!f||p.cat===f)&&(!bf||p.brand===bf)&&(!q||(`${p.name||''} ${p.en||''} ${p.desc||''} ${p.brand||''}`).toLowerCase().includes(q)));document.getElementById('grid').innerHTML=list.map(p=>{const img=safeImg(mainImagesOf(p)[0],LOGO);const vs=variantList(p);const stock=totalStock(p);const sold=stock<=0;const defaultVariant=vs.find(v=>v.stock>0)?.name||'';const inCart=(findCartItem(p.id,defaultVariant)?.qty)||0;const soldVariants=vs.filter(v=>v.stock<=0);return `<article class="card ${sold?'soldOutCard':''}"><div class="pic" onclick="openProduct(${p.id})"><button class="favBtn ${isFavorite(p.id)?'active':''}" type="button" onclick="event.stopPropagation();toggleFavorite(${p.id})">${isFavorite(p.id)?'♥':'♡'}</button><img src="${img}" onerror="this.onerror=null;this.src='${LOGO}'">${p.onSale&&p.old>p.price?`<span class="discount">-${Math.round((1-p.price/p.old)*100)}%</span>`:''}${sold?`<div class="soldStamp">💕<span>عذرًا سيدتي،<br>خلصت الكمية🌸</span></div>`:''}</div><div class="body"><h3>${esc(currentLang==='en'?(p.en||p.name):p.name)}</h3><p>${esc(p.desc||'')}</p>${productVideoHtml(p)}<div class="priceLine"><span class="price">${Number(p.price)||0} ₪</span>${p.onSale&&p.old>p.price?`<span class="old">${Number(p.old)} ₪</span>`:''}${p.onSale&&Number(p.old)>Number(p.price)?`<span class="offerText">لأجلك سيدتي</span>`:''}${Number(storeCommerceSettings.visaDiscountPercent)>0?`<span class="visaOffer">💳 خصم Visa ${Number(storeCommerceSettings.visaDiscountPercent)}%</span>`:''}</div>${vs.length?`<div class="variantBox"><div class="variantLabel">${currentLang==='en'?'Available colors':'الألوان المتوفرة'}</div><div class="variantChips">${vs.map(v=>`<span class="variantChip ${v.stock<=0?'sold':''}">${esc(v.name)}${v.stock<=0?' — خلص':''}</span>`).join('')}</div>${soldVariants.length<vs.length?renderVariantChooser(p):''}</div>`:''}${sold?`<div class="soldText">${outOfStockMessage()}</div><button class="waitBtn" onclick="joinWaitlist(${p.id})">${currentLang==='en'?'🔔 Join availability list':'🔔 سجّلي في قائمة التوفر'}</button><button class="similarBtn" onclick="showSimilar(${jsAttr(p.cat)},${p.id})">${currentLang==='en'?'🌸 See similar items':'🌸 شوفي أشياء بتشبهها'}</button>`:`<button class="add" onclick="addSingleToCart(${p.id},selectedVariant(${p.id}))">${currentLang==='en'?'Add to cart':'أضيفي للسلة'}</button><div class="quantityBar"><button onclick="changeProductQty(${p.id},-1,selectedVariant(${p.id}))">−</button><span class="num" id="qtyNum_${p.id}">${inCart}</span><button onclick="changeProductQty(${p.id},1,selectedVariant(${p.id}))">+</button></div><small class="stockHint" id="stockHint_${p.id}">${vs.length?`متوفر من اللون ${esc(defaultVariant)}: ${variantStock(p,defaultVariant)}`:`${currentLang==='en'?`Available: ${stock}`:`متوفر: ${stock}`}`}</small>${((vs.length?variantStock(p,defaultVariant):stock)>0&&(vs.length?variantStock(p,defaultVariant):stock)<=3)?`<div class="lowStockAlert" id="lowStock_${p.id}">${lowStockMessage((vs.length?variantStock(p,defaultVariant):stock))}</div>`:''}`}</div></article>`}).join('')||'<div class="empty">لا توجد منتجات</div>';updateCount()}
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
      if(/\.(mp4|webm|ogg)(?:$|\?)/i.test(u.href)){
        return `<div class="productVideo"><video controls preload="metadata" playsinline src="${esc(u.href)}"></video></div>`;
      }
      return `<a class="productVideoLink" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">▶ مشاهدة فيديو المنتج</a>`;
    }catch{return ''}
  }).filter(Boolean).join('');
  return cards?`<div class="productVideos"><h3>${currentLang==='en'?'Product videos':'فيديوهات المنتج'}</h3>${cards}</div>`:'';
}
function openProduct(id){const productHash='#product-'+id;if(location.hash!==productHash){history.pushState({productId:Number(id)},'',productHash);}const p=products.find(x=>x.id===id);if(!p)return;const mains=mainImagesOf(p),subs=subImagesOf(p),imgs=[...mains,...subs];document.getElementById('modalBody').innerHTML=`<div class="modalGrid"><div><img id="mainProductImg" class="mainImg" src="${safeImg(imgs[0],LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"><div class="thumbs">${imgs.map((x,i)=>`<img class="${i===0?'active':''}" src="${safeImg(x)}" onerror="this.style.display='none'" onclick="pickImg(this,${jsAttr(x)})">`).join('')}</div></div><div><h1>${esc(currentLang==='en'?(p.en||p.name):p.name)}</h1><p>${esc(p.desc||'')}</p><div class="priceLine"><h2 class="price">${Number(p.price)||0} ₪</h2>${p.onSale&&p.old>p.price?`<span class="old">${Number(p.old)} ₪</span>`:''}${p.onSale&&Number(p.old)>Number(p.price)?`<span class="offerText">لأجلك سيدتي</span>`:''}${Number(storeCommerceSettings.visaDiscountPercent)>0?`<span class="visaOffer">💳 خصم Visa ${Number(storeCommerceSettings.visaDiscountPercent)}%</span>`:''}</div>${variantList(p).length?renderVariantChooser(p):''}${renderPackagingOptions()}${completeLookHtml(p)}<button class="add" onclick="addSingleToCart(${p.id},selectedVariant(${p.id}),selectedPackaging());closeModal()">${currentLang==='en'?'Add to cart':'أضيفي للسلة'}</button></div></div>`;document.getElementById('modal').style.display='flex'}
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
async function openCart(){document.getElementById('drawer').style.display='block';if(lfToken())await lfLoadLoyalty();renderCart()}function closeCart(){document.getElementById('drawer').style.display='none'}
function updateCartPackaging(id,variant,packagingId,oldPackagingId=''){const x=findCartItem(id,variant||'',oldPackagingId||'');if(!x)return;x.packagingId=packagingId||'';save('lf_cart',cart);renderCart();updateCount()}
function changeCartQty(id,d,variant,packagingId){changeProductQty(id,d,variant,packagingId||'')}
function updateCount(){document.getElementById('count').textContent=cart.reduce((a,b)=>a+(Number(b.qty)||0),0)}
function getCoupons(){return load('lf_coupons',[]).filter(c=>c&&c.active!==false)}
function findCoupon(code){const c=String(code||'').trim().toUpperCase();return getCoupons().find(x=>String(x.code||'').toUpperCase()===c)||null}
let couponCode=localStorage.getItem('lf_coupon')||'';
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
  const coupon=findCoupon(code);
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
function applyCoupon(){const input=document.getElementById('couponInput');const code=String(input?.value||'').trim().toUpperCase();if(!code)return alert(currentLang==='en'?'Enter a coupon code':'اكتبي كود الخصم');const c=findCoupon(code);if(!c)return alert(currentLang==='en'?'Invalid or expired coupon':'كود الخصم غير صحيح أو غير فعال');couponCode=code;localStorage.setItem('lf_coupon',couponCode);renderCart();alert(currentLang==='en'?'Coupon applied':'تم تطبيق كود الخصم')}
function clearCoupon(){couponCode='';localStorage.removeItem('lf_coupon');renderCart()}
function updateCheckoutTotal(){const pay=document.querySelector('input[name="pay"]:checked')?.value||'cod';const t=getCartTotals(pay);const el=document.getElementById('checkoutTotal');if(el)el.textContent=`${currentLang==='en'?'Total:':'الإجمالي:'} ${t.total.toFixed(2)} ₪`;const sh=document.getElementById('shippingLine');if(sh)sh.textContent=`${currentLang==='en'?'Delivery:':'التوصيل:'} ${t.shippingRegionName} — ${t.shippingFee.toFixed(2)} ₪`;const pkg=document.getElementById('packagingTotalLine');if(pkg)pkg.textContent=t.packagingTotal>0?`🎁 ${currentLang==='en'?'Wrapping:':'التغليف:'} +${t.packagingTotal.toFixed(2)} ₪`:'';const vd=document.getElementById('visaDiscountLine');if(vd)vd.textContent=t.visaDiscount>0?`خصم Visa: -${t.visaDiscount.toFixed(2)} ₪`:'';const cd=document.getElementById('couponDiscountLine');if(cd)cd.textContent=t.couponDiscount>0?`${currentLang==='en'?'Coupon discount:':'خصم الكوبون:'} -${t.couponDiscount.toFixed(2)} ₪`:'';const ld=document.getElementById('loyaltyDiscountLine');if(ld)ld.textContent=t.loyaltyDiscount>0?`⭐ خصم استبدال النقاط: -${t.loyaltyDiscount.toFixed(2)} ₪ (${t.pointsRedeemed} نقطة)`:''}
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
    pay: document.querySelector('input[name="pay"]:checked')?.value||'cod'
  };
}
function saveCheckoutDraft(){
  try{const d=getCheckoutDraft();if(d)localStorage.setItem('lf_checkout_draft',JSON.stringify(d));}catch(e){}
}
function loadCheckoutDraft(){
  try{return JSON.parse(localStorage.getItem('lf_checkout_draft')||'null')}catch(e){return null}
}
function clearCheckoutDraft(){try{localStorage.removeItem('lf_checkout_draft')}catch(e){}}
function restoreCheckoutDraft(){
  const d=loadCheckoutDraft();
  if(!d)return;
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v};
  if(document.getElementById('checkoutCountryCode')&&d.countryIso){document.getElementById('checkoutCountryCode').value=d.countryIso;syncCountryDialPreview('checkoutCountryCode','phone')}set('name',d.name);set('phone',d.phone);set('city',d.city);set('address',d.address);set('notes',d.notes);set('shippingRegion',d.shippingRegion||'westbank');
  const pay=document.querySelector(`input[name="pay"][value="${d.pay||'cod'}"]`);if(pay)pay.checked=true;
  if(d.open){const f=document.getElementById('checkoutForm');const gate=document.querySelector('.checkoutGate');if(f){f.classList.add('open');if(gate)gate.style.display='none';}}
  updateCheckoutTotal();
}
function setupFeatureDrag(id){/* v36: native touch scrolling; no pointer hijacking. */}
function setupFeatureDrags(){/* intentionally empty; native carousel handles touch/scroll */}

function renderCart(){saveCheckoutDraft();updateCount();const el=document.getElementById('cart'),checkout=document.getElementById('checkout');if(!cart.length){clearCheckoutDraft();el.innerHTML=`<div class="empty">${currentLang==='en'?'Your cart is empty':'السلة فارغة'}</div>`;checkout.innerHTML='';return}el.innerHTML=cart.map(i=>{const p=products.find(x=>x.id===i.id);if(!p)return '';const qty=Number(i.qty)||1,totalLine=(Number(p.price)||0)*qty;return `<div class="cartrow"><div class="cartpic" onclick="openProduct(${p.id})" style="cursor:pointer"><img src="${safeImg(mainImagesOf(p)[0],LOGO)}" onerror="this.onerror=null;this.src='${LOGO}'"></div><div class="info"><b>${esc(currentLang==='en'?(p.en||p.name):p.name)}</b>${i.variant?`<div>${currentLang==='en'?'Color:':'اللون:'} ${esc(i.variant)}</div>`:''}<div class="cartPackaging"><label>🎁 ${currentLang==='en'?'Gift wrapping:':'التغليف:'}</label><select onchange="updateCartPackaging(${p.id},${jsAttr(i.variant||'')},this.value,${jsAttr(i.packagingId||'')})"><option value="" ${!i.packagingId?'selected':''}>${currentLang==='en'?'No wrapping':'بدون تغليف'}</option>${getPackagingOptions().map(x=>`<option value="${esc(x.id)}" ${i.packagingId===x.id?'selected':''}>${esc(currentLang==='en'?(x.nameEn||x.nameAr):(x.nameAr||x.nameEn))} +${Number(x.price)||0} ₪</option>`).join('')}</select></div><div>${Number(p.price)||0} ₪ × ${qty} = ${totalLine} ₪${getPackaging(i.packagingId)?` + ${Number(getPackaging(i.packagingId).price)||0} ₪ ${currentLang==='en'?'wrapping':'تغليف'}`:''}</div>${Number(storeCommerceSettings.visaDiscountPercent)>0?`<div class="visaOffer">💳 ${currentLang==='en'?'Visa discount':'خصم Visa'} ${Number(storeCommerceSettings.visaDiscountPercent)}%</div>`:''}</div><div class="qty"><button onclick="changeCartQty(${p.id},-1,${jsAttr(i.variant||'')},${jsAttr(i.packagingId||'')})">−</button><b>${qty}</b><button onclick="changeCartQty(${p.id},1,${jsAttr(i.variant||'')},${jsAttr(i.packagingId||'')})">+</button></div></div>`}).join('');const t=getCartTotals(document.querySelector('input[name="pay"]:checked')?.value||'cod');checkout.innerHTML=`<div class="checkoutGate"><button class="add" type="button" onclick="openCheckoutForm()">🧾 ${currentLang==='en'?'Complete order / Buyer details':'إتمام الطلب وإدخال بيانات المشتري'}</button></div><div id="checkoutForm" class="checkoutForm"><div class="orderFormTitle">🧾 ${currentLang==='en'?'Complete order & buyer details':'إتمام الطلب وإدخال بيانات المشتري'}</div><div class="checkout"><p id="visaPaymentNotice">${currentLang==='en'?'Visa selection does not charge your card online. We will contact you to arrange payment.':'اختيار Visa لا يخصم المبلغ إلكترونياً؛ سنتواصل معك لترتيب الدفع.'}</p><b id="checkoutTotal"></b><div id="visaDiscountLine" class="visaOffer" style="margin-top:8px"></div><div id="couponDiscountLine" class="couponLine" style="margin-top:8px"></div><div id="loyaltyDiscountLine" class="couponLine" style="margin-top:8px"></div><div class="couponBox"><b>🎟️ ${currentLang==='en'?'Discount code':'كود الخصم'}</b><div class="couponRow"><input id="couponInput" class="field" value="${esc(couponCode)}" placeholder="${currentLang==='en'?'Enter coupon code':'أدخلي كود الخصم'}"><button onclick="applyCoupon()">${currentLang==='en'?'Apply':'تطبيق'}</button>${couponCode?`<button class="danger" onclick="clearCoupon()">×</button>`:''}</div>${t.coupon?`<div class="couponApplied">✓ ${currentLang==='en'?'Applied':'تم تطبيق'}: ${esc(t.coupon.code)}</div>`:''}</div><div id="loyaltyBox" class="couponBox" style="display:${lfLoyalty?.settings?.enabled?'block':'none'}"><b>⭐ استبدال النقاط</b><div class="small">رصيدك: ${Number(lfLoyalty?.points||0)} نقطة — قيمة النقطة: ${Number(lfLoyalty?.settings?.pointValue||0).toFixed(2)} ₪</div><div class="couponRow"><input id="pointsRedeem" class="field" type="number" min="0" max="${Number(lfLoyalty?.points||0)}" step="1" value="0" oninput="updateCheckoutTotal()"><button type="button" onclick="document.getElementById('pointsRedeem').value=${Number(lfLoyalty?.points||0)};updateCheckoutTotal()">استخدام الكل</button></div></div><input class="field" id="name" placeholder="${currentLang==='en'?'Full name':'الاسم الكامل'}"><div class="phoneIntlBox checkoutPhoneBox"><div class="phoneIntlTop"><select id="checkoutCountryCode" class="field countrySelect" onchange="syncCountryDialPreview('checkoutCountryCode','phone')"></select><span class="phoneDialHint" id="phoneDialHint">+970</span></div><input class="field" id="phone" placeholder="${currentLang==='en'?'Mobile number without country code':'رقم الجوال بدون مفتاح الدولة'}" inputmode="tel" autocomplete="tel-national"></div><input class="field" id="city" placeholder="${currentLang==='en'?'City':'المدينة'}"><input class="field" id="address" placeholder="${currentLang==='en'?'Full address':'العنوان بالتفصيل'}"><div class="shippingBox"><b>🚚 ${currentLang==='en'?'Delivery area':'منطقة التوصيل'}</b><select id="shippingRegion" onchange="updateCheckoutTotal()"><option value="westbank">${currentLang==='en'?'West Bank — 20 ₪':'الضفة الغربية — 20 ₪'}</option><option value="jerusalem">${currentLang==='en'?'Jerusalem — 35 ₪':'القدس — 35 ₪'}</option><option value="inside">${currentLang==='en'?'Inside 1948 — 70 ₪':'الداخل — 70 ₪'}</option></select><div id="packagingTotalLine" class="shippingInfo"></div><div id="shippingLine" class="shippingInfo"></div></div><textarea class="field" id="notes" placeholder="${currentLang==='en'?'Notes':'ملاحظات'}"></textarea><div class="pay"><label><input type="radio" name="pay" value="cod" checked onchange="updateCheckoutTotal()"> ${currentLang==='en'?'Cash on delivery':'الدفع عند الاستلام'}</label><label><input type="radio" name="pay" value="visa" aria-describedby="visaPaymentNotice" onchange="updateCheckoutTotal()"> 💳 Visa</label></div><button class="add" onclick="placeOrder()">${currentLang==='en'?'Place order':'إنهاء الطلب'}</button></div></div>`;restoreCheckoutDraft();initCountrySelectors();syncCountryDialPreview('checkoutCountryCode','phone');updateCheckoutTotal()}
function openCheckoutForm(){const f=document.getElementById('checkoutForm');if(f){f.classList.add('open');const gate=document.querySelector('.checkoutGate');if(gate)gate.style.display='none';setTimeout(()=>{const n=document.getElementById('name');if(n)n.focus();f.scrollIntoView({behavior:'smooth',block:'start'});},80);}}

const COUNTRY_DIAL_CODES={"PS":"970","JO":"962","SA":"966","AE":"971","QA":"974","KW":"965","BH":"973","OM":"968","YE":"967","EG":"20","LB":"961","SY":"963","IQ":"964","TR":"90","CY":"357","IL":"972","US":"1","CA":"1","GB":"44","DE":"49","FR":"33","IT":"39","ES":"34","PT":"351","NL":"31","BE":"32","CH":"41","AT":"43","SE":"46","NO":"47","DK":"45","FI":"358","IS":"354","IE":"353","PL":"48","CZ":"420","SK":"421","HU":"36","RO":"40","BG":"359","GR":"30","RU":"7","UA":"380","BY":"375","GE":"995","AM":"374","AZ":"994","KZ":"7","UZ":"998","TM":"993","KG":"996","TJ":"992","CN":"86","JP":"81","KR":"82","IN":"91","PK":"92","BD":"880","LK":"94","NP":"977","AF":"93","IR":"98","ID":"62","MY":"60","SG":"65","TH":"66","VN":"84","PH":"63","KH":"855","LA":"856","MM":"95","MN":"976","AU":"61","NZ":"64","FJ":"679","PG":"675","ZA":"27","NG":"234","KE":"254","TZ":"255","UG":"256","GH":"233","ET":"251","MA":"212","DZ":"213","TN":"216","LY":"218","SD":"249","SS":"211","SO":"252","DJ":"253","ER":"291","SN":"221","GM":"220","GN":"224","SL":"232","LR":"231","CI":"225","BF":"226","ML":"223","NE":"227","TD":"235","CM":"237","CF":"236","GA":"241","CG":"242","CD":"243","GQ":"240","ST":"239","AO":"244","NA":"264","BW":"267","ZM":"260","ZW":"263","MZ":"258","MW":"265","MG":"261","MU":"230","SC":"248","KM":"269","CV":"238","MR":"222","BI":"257","RW":"250","BJ":"229","TG":"228","LS":"266","SZ":"268","AR":"54","BR":"55","CL":"56","PE":"51","CO":"57","VE":"58","EC":"593","BO":"591","PY":"595","UY":"598","GY":"592","SR":"597","GF":"594","FK":"500","MX":"52","GT":"502","BZ":"501","HN":"504","SV":"503","NI":"505","CR":"506","PA":"507","DO":"1","JM":"1","TT":"1","BB":"1","BS":"1","CU":"53","HT":"509","PR":"1","VI":"1","VG":"1","KY":"1","BM":"1","LC":"1","VC":"1","GD":"1","AG":"1","DM":"1","KN":"1","MS":"1","TC":"1","AW":"297","CW":"599","SX":"1721","BQ":"599","GL":"299","FO":"298","GI":"350","MT":"356","LU":"352","MC":"377","SM":"378","VA":"39","AD":"376","LI":"423","BA":"387","RS":"381","ME":"382","XK":"383","MK":"389","SI":"386","HR":"385","AL":"355","EE":"372","LV":"371","LT":"370","MD":"373","JE":"44","GG":"44","IM":"44","AX":"358","IO":"246","CX":"61","CC":"61","NF":"672","TK":"690","TO":"676","WS":"685","VU":"678","SB":"677","KI":"686","NR":"674","TV":"688","NC":"687","PF":"689","WF":"681","GU":"1","MP":"1","AS":"1","FM":"691","MH":"692","PW":"680","CK":"682","NU":"683","AQ":"672","SH":"290","RE":"262","YT":"262","GP":"590","MQ":"596","BL":"590","MF":"590","PM":"508","PN":"64","UM":"1","HK":"852","MO":"853","TW":"886","BN":"673","BT":"975","MV":"960"};
const COUNTRY_NAMES={};
function countryName(iso){try{return new Intl.DisplayNames([currentLang==='en'?'en':'ar'],{type:'region'}).of(iso)||iso}catch(e){return iso}}
function countryOptions(selected='PS'){return Object.keys(COUNTRY_DIAL_CODES).sort((a,b)=>countryName(a).localeCompare(countryName(b),currentLang==='en'?'en':'ar')).map(iso=>`<option value="${iso}" data-dial="+${COUNTRY_DIAL_CODES[iso]}" ${iso===selected?'selected':''}>${countryName(iso)} (+${COUNTRY_DIAL_CODES[iso]})</option>`).join('')}
function selectedDial(id){const el=document.getElementById(id);if(!el)return '+970';return el.selectedOptions?.[0]?.dataset.dial||('+ '+(COUNTRY_DIAL_CODES[el.value]||'970')).replace(' ','')}
function fillCountrySelect(id,selected='PS'){const el=document.getElementById(id);if(!el)return;const keep=selected||el.value||'PS';el.innerHTML=countryOptions(keep);}
function initCountrySelectors(){const a=getAccount?.();const aSel=document.getElementById('accountCountryCode');if(aSel){fillCountrySelect('accountCountryCode',a?.countryIso||'PS');if(a?.countryIso&&COUNTRY_DIAL_CODES[a.countryIso])aSel.value=a.countryIso}const aeSel=document.getElementById('accountCountryEdit');if(aeSel){fillCountrySelect('accountCountryEdit',a?.countryIso||'PS');if(a?.countryIso&&COUNTRY_DIAL_CODES[a.countryIso])aeSel.value=a.countryIso}const cSel=document.getElementById('checkoutCountryCode');if(cSel){const draft=load('lf_checkout_draft',{});fillCountrySelect('checkoutCountryCode',draft?.countryIso||'PS');if(draft?.countryIso&&COUNTRY_DIAL_CODES[draft.countryIso])cSel.value=draft.countryIso}}
function internationalPhone(countryIso,number){let n=String(number||'').trim().replace(/[\s\-().]/g,'');if(!n)return '';if(/^00/.test(n))n='+'+n.slice(2);if(/^\+/.test(n))return '+'+n.slice(1).replace(/\D/g,'');const dial=COUNTRY_DIAL_CODES[countryIso]||'970';n=n.replace(/\D/g,'');if(n.startsWith(dial))return '+'+n;if(n.startsWith('0'))n=n.slice(1);return '+'+dial+n}
function normalizePhone(v,countryIso=''){let n=String(v||'').trim().replace(/[\s\-().]/g,'');if(/^00/.test(n))n='+'+n.slice(2);if(/^\+/.test(n))return '+'+n.slice(1).replace(/\D/g,'');if(countryIso)return internationalPhone(countryIso,n);return n.replace(/\D/g,'')}
function validMobile(v,countryIso=''){const n=normalizePhone(v,countryIso);return /^\+[1-9]\d{6,14}$/.test(n)}
function detectCountryByGPS(targetId='accountCountryCode'){const btn=document.getElementById('gpsCountryBtn');if(btn){btn.disabled=true;btn.textContent='📍 جارٍ تحديد الدولة...'}if(!navigator.geolocation){if(btn){btn.disabled=false;btn.textContent='📍 تحديد الدولة تلقائيًا'}return alert('المتصفح لا يدعم تحديد الموقع. اختاري الدولة يدويًا.')}navigator.geolocation.getCurrentPosition(async pos=>{try{const u=`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(pos.coords.latitude)}&longitude=${encodeURIComponent(pos.coords.longitude)}&localityLanguage=${currentLang==='en'?'en':'ar'}`;const r=await fetch(u);const d=await r.json();const iso=String(d.countryCode||'').toUpperCase();if(!COUNTRY_DIAL_CODES[iso])throw new Error('country');const el=document.getElementById(targetId);if(el){el.value=iso;el.dispatchEvent(new Event('change',{bubbles:true}))}const name=d.countryName||countryName(iso);if(targetId==='accountCountryCode'){const a=load(ACCOUNT_KEY,{});a.countryIso=iso;a.countryName=name;save(ACCOUNT_KEY,a)}if(btn){btn.disabled=false;btn.textContent='📍 تم تحديد الدولة: '+name}setTimeout(()=>{if(btn)btn.textContent='📍 تحديد الدولة تلقائيًا'},2500)}catch(e){if(btn){btn.disabled=false;btn.textContent='📍 تحديد الدولة تلقائيًا'}alert('تعذر تحديد الدولة تلقائيًا. اختاريها يدويًا.')}},()=>{if(btn){btn.disabled=false;btn.textContent='📍 تحديد الدولة تلقائيًا'}alert('لم يتم السماح بالموقع. يمكنك اختيار الدولة يدويًا بدون GPS.')},{enableHighAccuracy:true,timeout:10000,maximumAge:300000})}
function syncCountryDialPreview(selectId,inputId){const s=document.getElementById(selectId),i=document.getElementById(inputId);if(!s||!i)return;const dial=s.selectedOptions?.[0]?.dataset.dial||'+970';i.dataset.dial=dial;const hint=document.getElementById(inputId==='phone'?'phoneDialHint':(inputId==='accountContactEdit'?'accountDialEdit':'accountDialHint'));if(hint)hint.textContent=dial}


function makeOrderItems(pay){return cart.map(i=>{const p=products.find(x=>x.id===i.id);if(!p)return null;const qty=Math.max(1,Number(i.qty)||1),price=Number(p.price)||0,base=price*qty,visaPct=Math.min(100,Math.max(0,Number(storeCommerceSettings.visaDiscountPercent)||0)),disc=pay==='visa'?base*(visaPct/100):0;const pkg=getPackaging(i.packagingId);const packagingPrice=pkg?Math.max(0,Number(pkg.price)||0):0;return {productId:p.id,name:p.name,en:p.en,cat:p.cat,variant:i.variant||'',price,old:Number(p.old)||0,desc:p.desc||'',images:Array.isArray(p.images)?p.images.slice(0,8):[],qty,visaDiscountPercent:visaPct,visaDiscountAmount:disc,packagingId:i.packagingId||'',packagingName:pkg?(pkg.nameAr||pkg.nameEn):'',packagingPrice,lineTotal:base-disc+packagingPrice*qty}}).filter(Boolean)}
function whatsappOrderUrl(order){const lines=['🛍️ *طلب جديد - Ladies First*',`رقم الطلب: #${order.id}`,`👤 ${order.name}`,`📞 ${order.phone}`,`📍 ${order.city} — ${order.address}`,`💳 ${currentLang==='en'?'Payment':'الدفع'}: ${order.pay==='visa'?'Visa — لم يتم تحصيل المبلغ إلكترونياً':(currentLang==='en'?'Cash on delivery':'الدفع عند الاستلام')}`,'','*المنتجات:*'];order.items.forEach(it=>{lines.push(`• ${it.name} × ${it.qty} — ${Number(it.lineTotal).toFixed(2)} ₪`);if(order.pay==='visa'&&Number(it.visaDiscountPercent)>0)lines.push(`  خصم Visa ${it.visaDiscountPercent}%`);if(Number(it.packagingPrice)>0)lines.push(`  🎁 التغليف: ${it.packagingName||'تغليف'} +${Number(it.packagingPrice).toFixed(2)} ₪`)});if(Number(order.couponDiscount)>0)lines.push(`🎟️ كود الخصم: ${order.couponCode} — -${Number(order.couponDiscount).toFixed(2)} ₪`);lines.push('',`🚚 ${currentLang==='en'?'Delivery:':'التوصيل:'} ${order.shippingRegionName||''} — ${order.shippingWaived?'معفى':Number(order.shippingFee||0).toFixed(2)+' ₪'}`,`💰 ${currentLang==='en'?'Total:':'الإجمالي:'} ${Number(order.total).toFixed(2)} ₪`,`📝 ${order.notes|| (currentLang==='en'?'No notes':'لا توجد ملاحظات')}`);return storeWhatsAppHref(lines.join('\n'))}
function sendOrderWhatsApp(order){window.open(whatsappOrderUrl(order),'_blank','noopener')}
function placeOrder(){if(!cart.length)return alert(currentLang==='en'?'Your cart is empty':'السلة فارغة');const name=document.getElementById('name').value.trim(),phoneRaw=document.getElementById('phone').value.trim(),countryIso=document.getElementById('checkoutCountryCode')?.value||'PS',phone=normalizePhone(phoneRaw,countryIso),city=document.getElementById('city').value.trim(),address=document.getElementById('address').value.trim();if(!name||!phoneRaw||!city||!address)return alert(currentLang==='en'?'Please fill in name, phone, city and address':'يرجى تعبئة الاسم والجوال والمدينة والعنوان');if(!validMobile(phoneRaw,countryIso))return alert(currentLang==='en'?'Enter a valid international mobile number':'أدخل رقم جوال صحيح مع اختيار الدولة');const pay=document.querySelector('input[name="pay"]:checked')?.value||'cod';const items=makeOrderItems(pay);if(!items.length)return alert('تعذر تجهيز المنتجات في الطلب');for(const it of items){const p=products.find(x=>x.id===it.productId);const available=variantStock(p,it.variant);if(!p||Number(it.qty)>available)return alert(insufficientStockMessage(available))}const totals=getCartTotals(pay);const total=totals.total;const orders=load('lf_orders',[]);const order={id:Date.now(),createdAt:Date.now(),date:new Date().toLocaleString('ar-PS'),name,phone:normalizePhone(phone),city,address,notes:document.getElementById('notes').value.trim(),pay,total,subtotal:totals.subtotal,visaDiscount:totals.visaDiscount,couponCode:totals.coupon?.code||'',couponDiscount:totals.couponDiscount||0,couponType:totals.coupon?.type||'',couponValue:totals.coupon?.value||0,shippingRegion:totals.shippingRegion,shippingRegionName:totals.shippingRegionName,shippingFee:totals.shippingFee,shippingWaived:false,accountRef:getAccount()?.contact||'',items,status:'جديد',inventoryState:'deducted'};orders.unshift(order);if(!save('lf_orders',orders))return;items.forEach(it=>{const p=products.find(x=>x.id===it.productId);const vs=variantList(p);if(vs.length){const v=p.variants.find(v=>v.name===it.variant);if(v)v.stock=Math.max(0,Number(v.stock)||0)-Number(it.qty);p.stock=totalStock(p)}else p.stock=Math.max(0,(Number(p.stock)||0)-Number(it.qty));});save('lf_products',products);cart=[];save('lf_cart',cart);couponCode='';localStorage.removeItem('lf_coupon');clearCheckoutDraft();renderProducts();renderCart();document.getElementById('drawer').style.display='block';document.getElementById('checkout').innerHTML=`<div class="success"><b>تم استلام طلبك بنجاح 🌸</b>${pay==='visa'?'<p>لم يتم تحصيل المبلغ إلكترونياً. سنتواصل معك لترتيب الدفع.</p>':''}<br>رقم الطلب: #${order.id}<br>السلة أصبحت فارغة.<br><button class="add" style="margin-top:10px" onclick='sendOrderWhatsApp(${esc(JSON.stringify(order))})'>💬 إرسال الطلب عبر WhatsApp</button></div>`;setTimeout(()=>sendOrderWhatsApp(order),350)}
let heroIndex=0,heroTimer=null,heroLayer='A';
function getCustomHeroSlides(){
  let arr=load('lf_hero_slides',null);
  if(!Array.isArray(arr)) arr=[];
  return arr.filter(x=>x&&x.image);
}

const DEFAULT_HERO_TEXT_STYLE={font:'Tahoma,Arial,sans-serif',color:'#ffffff',opacity:1,bgColor:'#63345e',bgOpacity:.58};
function getHeroTextStyle(){
  const s=load('lf_hero_text_style',DEFAULT_HERO_TEXT_STYLE)||DEFAULT_HERO_TEXT_STYLE;
  return {font:s.font||DEFAULT_HERO_TEXT_STYLE.font,color:s.color||DEFAULT_HERO_TEXT_STYLE.color,opacity:Math.max(0,Math.min(1,Number(s.opacity??1))),bgColor:s.bgColor||DEFAULT_HERO_TEXT_STYLE.bgColor,bgOpacity:Math.max(0,Math.min(1,Number(s.bgOpacity??DEFAULT_HERO_TEXT_STYLE.bgOpacity)))};
}
function hexToRgba(hex,a){const h=String(hex||'#63345e').replace('#','');const v=h.length===3?h.split('').map(x=>x+x).join(''):h;const n=parseInt(v,16);if(Number.isNaN(n))return `rgba(99,52,94,${a})`;return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
function applyHeroTextStyle(){
  const s=getHeroTextStyle();
  document.documentElement.style.setProperty('--hero-font',s.font);
  document.documentElement.style.setProperty('--hero-text-color',s.color);
  document.documentElement.style.setProperty('--hero-text-opacity',String(s.opacity));
  document.documentElement.style.setProperty('--hero-text-bg',hexToRgba(s.bgColor,s.bgOpacity));
}
function heroSlides(){
  const base=load('lf_hero',DEFAULT_HERO)||DEFAULT_HERO;
  const custom=getCustomHeroSlides();
  const baseSlide={image:base.image||LOGO,titleAr:'كل ما تحتاجينه.. في مكان واحد',titleEn:'Everything you need.. in one place',descAr:'منتجات مختارة بعناية لتكملي إطلالتك.',descEn:'Carefully selected products to complete your look.',id:'main-site-image'};
  const arr=[];
  (custom.length?custom:[baseSlide]).forEach(x=>{
    const key=x.image||'';
    if(!key)return;
    arr.push({image:key,title:currentLang==='en'?(x.titleEn||x.titleAr||'Ladies First'):(x.titleAr||x.titleEn||'Ladies First'),desc:currentLang==='en'?(x.descEn||x.descAr||''):(x.descAr||x.descEn||''),id:x.id});
  });
  return arr;
}
function renderHeroSlider(fade=true){
  applyHeroTextStyle();
  const slides=heroSlides();
  if(!slides.length)return;
  if(heroIndex>=slides.length)heroIndex=0;
  const s=slides[heroIndex];
  const title=document.getElementById('heroTitle'),desc=document.getElementById('heroDesc'),cta=document.getElementById('heroCta');
  if(title)title.textContent=s.title;if(desc)desc.textContent=s.desc;if(cta)cta.textContent=currentLang==='en'?'Shop now':'تسوقي الآن';
  const active=document.getElementById(heroLayer==='A'?'heroLogoA':'heroLogoB');
  const inactive=document.getElementById(heroLayer==='A'?'heroLogoB':'heroLogoA');
  if(active){active.src=safeImg(s.image,LOGO);active.onerror=()=>{active.onerror=null;active.src=LOGO};active.classList.add('active')}
  if(inactive)inactive.classList.remove('active');
  const dots=document.getElementById('heroDots');
  if(dots)dots.innerHTML=slides.map((_,i)=>`<button class="${i===heroIndex?'active':''}" onclick="heroGo(${i})"></button>`).join('');
}
function heroGo(i){heroIndex=i;heroLayer=heroLayer==='A'?'B':'A';renderHeroSlider(true);restartHeroTimer()}
function heroMove(d){const n=heroSlides().length;if(n<2)return;heroIndex=(heroIndex+d+n)%n;heroLayer=heroLayer==='A'?'B':'A';renderHeroSlider(true);restartHeroTimer()}
function restartHeroTimer(){clearTimeout(heroTimer);if(heroSlides().length<2)return;heroTimer=setTimeout(()=>{heroMove(1)},3000)}
function pauseHeroTimer(){clearTimeout(heroTimer)}
function resumeHeroTimer(){restartHeroTimer()}

const DEFAULT_SOCIAL_LINKS={whatsapp:{label:'واتساب',icon:'fa-brands fa-whatsapp',url:storeWhatsAppHref(),enabled:true,cls:'social-wa'},instagram:{label:'Instagram',icon:'fa-brands fa-instagram',url:'',enabled:true,cls:'social-instagram'},snapchat:{label:'Snapchat',icon:'fa-brands fa-snapchat',url:'',enabled:true,cls:'social-snapchat'},facebook:{label:'Facebook',icon:'fa-brands fa-facebook',url:'',enabled:true,cls:'social-facebook'},tiktok:{label:'TikTok',icon:'fa-brands fa-tiktok',url:'',enabled:true,cls:'social-tiktok'}};
function getSocialLinks(){const x=load('lf_social_links',null);const out={...DEFAULT_SOCIAL_LINKS};if(x&&typeof x==='object')Object.keys(out).forEach(k=>out[k]={...out[k],...(x[k]||{})});out.whatsapp.url=out.whatsapp.url||storeWhatsAppHref();return out}
function renderSocialLinks(){const el=document.getElementById('sideSocialLinks');if(!el)return;const links=getSocialLinks();el.innerHTML=Object.values(links).filter(x=>x.enabled!==false).map(x=>{const has=!!x.url;return `<a class="socialSideLink ${x.cls||''}" href="${has?esc(safeLink(x.url)):'#'}" ${has?'target="_blank" rel="noopener"':'aria-disabled="true" style="opacity:.62;cursor:default"'} onclick="${has?'event.stopPropagation()':'event.preventDefault();event.stopPropagation()'}"><i class="${esc(x.icon)}" aria-hidden="true"></i><span>${esc(x.label)}</span></a>`}).join('')||'<div class="small">لا توجد روابط مفعّلة حاليًا.</div>'}
function toggleSideMenu(){const o=document.getElementById('sideMenuOverlay');if(!o)return;const open=!o.classList.contains('open');o.classList.toggle('open',open);document.body.classList.toggle('side-menu-open',open);if(open)renderSideAccountGreeting()}function goHome(){document.getElementById('sideMenuOverlay')?.classList.remove('open');document.body.classList.remove('side-menu-open');window.scrollTo({top:0,behavior:'smooth'})}function focusSearch(){const s=document.getElementById('search');if(!s)return;s.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>s.focus(),250)}function updateNavCounts(){const n=cart.reduce((a,i)=>a+(Number(i.qty)||0),0);['bottomCount','sideCount'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=n})}const _updateCount=updateCount;updateCount=function(){_updateCount();updateNavCounts()};
function renderNewUiLang(){const en=currentLang==='en';const m={sideMenuTitle:en?'Menu':'القائمة',sideHomeText:en?'Home':'الرئيسية',sideSearchText:en?'Search':'البحث',sideCatsLabel:en?'Categories':'الأصناف',sideCartText:en?'Shopping cart':'سلة التسوق',sideReturnsText:en?'Exchange & Return Policy':'سياسة التبديل والإرجاع',bnHome:en?'Home':'الرئيسية',bnCats:en?'Categories':'الأصناف',bnCart:en?'Cart':'السلة',bnSearch:en?'Search':'بحث',bnWhats:'WhatsApp'};Object.entries(m).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v})}
window.addEventListener('storage',e=>{if(['lf_products','lf_cats','lf_brands','lf_hero','lf_hero_slides','lf_hero_text_style','lf_favorites','lf_account','lf_social_links','lf_users'].includes(e.key)){products=load('lf_products',products);cats=load('lf_cats',cats);brands=load('lf_brands',brands);renderHero();heroIndex=0;renderHeroSlider();restartHeroTimer();renderCats();renderProducts();renderFeatureSections()}if(e.key==='lf_cart'){cart=load('lf_cart',[]);renderProducts();renderCart()}});
function openProductFromHash(){const m=(location.hash||'').match(/^#product-(\d+)$/);if(m){const id=Number(m[1]);if(products.some(p=>p.id===id)){openProduct(id)}}else{const modal=document.getElementById('modal');if(modal)modal.style.display='none';}}
window.addEventListener('hashchange',openProductFromHash);window.addEventListener('popstate',openProductFromHash);document.getElementById('cartBtn').onclick=openCart;document.getElementById('lang').onclick=toggleLanguage;document.getElementById('lang').textContent=currentLang==='ar'?'EN':'عربي';renderHistory();renderStaticLang();setTimeout(openProductFromHash,50);
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
async function lfSyncMyOrders(){if(!lfToken())return;try{const d=await lfFetch('/api/orders');if(Array.isArray(d.orders))save('lf_orders',d.orders.map(o=>({id:o.id,createdAt:o.created_at,date:new Date(o.created_at).toLocaleString('ar-PS'),name:o.customer_name,phone:o.customer_phone||o.customer_contact,address:o.shipping_address||o.customer_address,total:o.total,subtotal:o.subtotal,couponDiscount:o.coupon_discount??o.discount??0,loyaltyDiscount:o.loyalty_discount||0,pointsRedeemed:o.points_redeemed||0,shippingFee:o.shipping_cost??o.shipping??0,shippingRegion:o.shipping_region||'',shippingWaived:o.shipping_waived===true,packagingTotal:o.packaging_cost??o.packaging??0,status:o.status,inventoryState:o.inventory_state,items:(o.items||[]).map(i=>({orderItemId:i.id,productId:i.productId??i.product_id,variant:i.variantName??i.variant_name??'',qty:i.quantity,name:i.productName??i.product_name??i.name_snapshot??'منتج',price:i.unitPrice??i.unit_price??i.price_snapshot??0,image:i.image||''}))})))}catch(e){console.warn('API orders unavailable',e.message)}}
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
placeOrder=async function(){if(!cart.length)return alert('السلة فارغة');const name=document.getElementById('name').value.trim(),phoneRaw=document.getElementById('phone').value.trim(),countryIso=document.getElementById('checkoutCountryCode')?.value||'PS',phone=normalizePhone(phoneRaw,countryIso),city=document.getElementById('city').value.trim(),address=document.getElementById('address').value.trim();if(!name||!phoneRaw||!city||!address)return alert('يرجى تعبئة الاسم والجوال والمدينة والعنوان');if(!validMobile(phoneRaw,countryIso))return alert('أدخل رقم جوال صحيح');const pay=document.querySelector('input[name="pay"]:checked')?.value||'cod',items=makeOrderItems(pay);if(!items.length)return alert('تعذر تجهيز المنتجات');let userId=null;if(lfToken()){const me=await lfSyncMe();userId=me?.id||null;await lfLoadLoyalty()}const totals=getCartTotals(pay),a=load(ACCOUNT_KEY,null);try{const d=await lfFetch('/api/orders',{method:'POST',body:JSON.stringify({userId,name,phone,contact:phone,city,address,customerName:name,customerPhone:phone,shippingAddress:`${city} - ${address}`,customer:{name,contact:phone,phone,address:`${city} - ${address}`,city,gender:a?.gender,age:a?.age},paymentMethod:pay,shippingRegion:totals.shippingRegion,shipping:totals.shippingFee,packaging:totals.packagingTotal,couponCode:totals.coupon?.code||null,pointsToRedeem:totals.pointsRedeemed||0,items:items.map(i=>({productId:String(i.productId),variantId:i.variantId||null,variantName:i.variant||null,packagingId:i.packagingId||null,quantity:i.qty}))})});cart=[];save('lf_cart',cart);await lfClearCartHeartbeat();couponCode='';localStorage.removeItem('lf_coupon');clearCheckoutDraft();await lfSyncProducts();await lfSyncMyOrders();renderCart();updateCount();document.getElementById('drawer').style.display='block';document.getElementById('checkout').innerHTML=`<div class="success"><b>تم استلام طلبك بنجاح 🌸</b>${pay==='visa'?'<p>لم يتم تحصيل المبلغ إلكترونياً. سنتواصل معك لترتيب الدفع.</p>':''}<br>رقم الطلب: #${d.orderId||d.order?.id||''}<br>السلة أصبحت فارغة.</div>`}catch(e){alert('تعذر تنفيذ الطلب: '+e.message);await lfSyncProducts()}};
async function lfSyncStoreSettings(){
  try{const d=await lfFetch('/api/settings'); const st=d.settings||{};
    if(st.cats&&typeof st.cats==='object'){cats=st.cats;save('lf_cats',cats)}
    if(st.brands&&typeof st.brands==='object'){brands=st.brands;save('lf_brands',brands)}
    if(st.hero&&typeof st.hero==='object'){heroSettings=st.hero;save('lf_hero',heroSettings)}
    if(Array.isArray(st.hero_slides))save('lf_hero_slides',st.hero_slides);
    if(st.hero_text_style&&typeof st.hero_text_style==='object')save('lf_hero_text_style',st.hero_text_style);
    if(st.social_links&&typeof st.social_links==='object')save('lf_social_links',st.social_links);
    if(Array.isArray(st.packaging_options))save('lf_packaging_options',st.packaging_options);
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
    storeCommerceSettings.whatsappNumber=String(st.whatsapp_number||st.whatsapp||storeCommerceSettings.whatsappNumber||'0562499924');
    DEFAULT_SOCIAL_LINKS.whatsapp.url=storeWhatsAppHref();
    updateStoreWhatsAppLinks();
    renderSocialLinks();
    heroIndex=0;renderHero();renderHeroSlider();restartHeroTimer();renderCats();renderProducts();renderFeatureSections();
  }catch(e){console.warn('API settings unavailable',e.message)}
}
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
function nayaAddMessage(text,user=false){const box=document.getElementById('nayaConversation');if(!box)return;const div=document.createElement('div');div.className='naya-message '+(user?'user':'naya');div.textContent=text;box.appendChild(div);box.scrollTop=box.scrollHeight}
function nayaAnswer(q){const t=String(q||'').trim().toLowerCase();const a=getAccount();if(!t)return 'أنا معكِ 🌸 اكتبي لي ماذا تريدين وسأساعدك.';if(t.includes('جسم')||t.includes('مقاس')||t.includes('تجربة')||t.includes('جربي')){openNayaBodyProfile();return 'أكيد 🌸 افتحي لوحة المقاسات ووافقي على رسالة الخصوصية، وبعدها أعطيكِ معاينة تقريبية على نايا.';}if(t.includes('سلة')||t.includes('cart'))return `عندكِ حاليًا ${cart.reduce((n,i)=>n+(Number(i.qty)||0),0)} قطعة في السلة 🛍️`+(cart.length?' ويمكنكِ فتحها من زر السلة.':'، والسلة فارغة حاليًا.');if(t.includes('مفضل')||t.includes('favorite'))return `عندكِ ${getFavorites().length} منتج في المفضلة ❤️`;if(t.includes('حساب')||t.includes('account'))return a?`حسابكِ محفوظ باسم ${a.name||'سيدتي'} 🩷 ويمكنكِ تعديل بياناته من حسابي.`:'يمكنكِ فتح حسابي وإنشاء حساب اختياري لحفظ بياناتك وطلباتك.';if(t.includes('واتس')||t.includes('whatsapp'))return 'يمكنكِ اختيار الدولة والمفتاح يدويًا أو استخدام تحديد الموقع، وبعدها حفظ تفضيلات رسائل واتساب 🌍💬';if(t.includes('عرض')||t.includes('سعر')||t.includes('منتج')){const hits=products.filter(p=>String(p.name||'').toLowerCase().includes(t)||String(p.en||'').toLowerCase().includes(t)).slice(0,3);if(hits.length)return 'وجدت لكِ: '+hits.map(p=>`${p.name} — ${Number(p.price)||0} ₪`).join(' | ');const offers=quickOffers().slice(0,3);if(offers.length)return 'هذه بعض العروض السريعة الآن: '+offers.map(p=>`${p.name} — ${Number(p.price)||0} ₪`).join(' | ')}if(t.includes('شحن')||t.includes('توصيل'))return 'التوصيل المعروض في المتجر يعتمد على منطقة الشحن عند إتمام الطلب 🚚';return `أهلًا ${a?.name||'فيكِ'} 🌸 أنا نايا، أقدر أساعدكِ في المنتجات والسلة والمفضلة والحساب والطلبات.`}
function sendNaya(){const input=document.getElementById('nayaInput');if(!input)return;const q=input.value.trim();if(!q)return;input.value='';nayaAddMessage(q,true);setTimeout(()=>nayaAddMessage(nayaAnswer(q),false),180)}
function nayaQuick(text){const input=document.getElementById('nayaInput');if(input){input.value=text;sendNaya()}}
window.addEventListener('DOMContentLoaded',async()=>{await lfSyncStoreSettings();await lfSyncMe();await lfLoadLoyalty();await lfSyncProducts();await lfSyncAccountState();await lfSyncCatalog();await lfSyncMyOrders();renderAccountContent();initCountrySelectors();updateAccountBadge();restartFeatureAuto();await openPublicOrderFromUrl()});
