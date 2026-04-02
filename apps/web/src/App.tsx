import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { formatLabel, type FormatTypeGql } from "./formatLabel";
import "./App.css";

const GET_BOOKS = gql`
  query Books(
    $search: String
    $genreId: ID
    $limit: Int!
    $cursor: String
    $userId: ID!
  ) {
    books(search: $search, genreId: $genreId, limit: $limit, cursor: $cursor) {
      edges {
        id
        title
        price
        publisher {
          name
        }
        authors {
          name
        }
        genres {
          id
          name
        }
        formats {
          id
          type
        }
        avgRating
        reviewCount
        hasReviewed(userId: $userId)
      }
      nextCursor
    }
  }
`;

const GET_GENRES = gql`
  query Genres {
    genres {
      id
      name
    }
  }
`;

const GET_USERS = gql`
  query Users($search: String, $limit: Int) {
    users(search: $search, limit: $limit) {
      id
      name
    }
  }
`;

const CHECKOUT = gql`
  mutation Checkout($userId: ID!, $items: [CheckoutLineInput!]!) {
    checkout(userId: $userId, items: $items) {
      id
      totalPrice
      createdAt
    }
  }
`;

const ADD_REVIEW = gql`
  mutation AddReview($bookId: ID!, $userId: ID!, $rating: Int!) {
    addReview(bookId: $bookId, userId: $userId, rating: $rating)
  }
`;

const GET_ORDERS = gql`
  query Orders($userId: ID!) {
    orders(userId: $userId) {
      id
      createdAt
      totalPrice
      items {
        id
        format
        quantity
        unitPrice
        lineTotal
        book {
          title
        }
      }
    }
  }
`;

const GET_SALES = gql`
  query SalesSummary {
    salesSummary {
      totalUnitsSold
      unitsByGenre {
        genreId
        genreName
        unitsSold
      }
    }
  }
`;

interface BooksQueryData {
  books: {
    edges: BookEdge[];
    nextCursor: string | null;
  };
}

interface BookEdge {
  id: string;
  title: string;
  price: number;
  publisher: { name: string };
  authors: { name: string }[];
  genres: { id: string; name: string }[];
  formats: { id: string; type: FormatTypeGql }[];
  avgRating: number;
  reviewCount: number;
  hasReviewed: boolean;
}

interface GenresQueryData {
  genres: { id: string; name: string }[];
}

interface UsersQueryData {
  users: { id: string; name: string }[];
}

interface OrdersQueryData {
  orders: {
    id: string;
    createdAt: string;
    totalPrice: number;
    items: {
      id: string;
      format: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      book: { title: string };
    }[];
  }[];
}

interface SalesQueryData {
  salesSummary: {
    totalUnitsSold: number;
    unitsByGenre: {
      genreId: string;
      genreName: string;
      unitsSold: number;
    }[];
  };
}

interface CartLine {
  key: string;
  bookId: string;
  title: string;
  format: FormatTypeGql;
  quantity: number;
  unitPrice: number;
}

export default function App() {
  const [tab, setTab] = useState<"browse" | "cart" | "orders">("browse");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [genreId, setGenreId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [reviewingBookId, setReviewingBookId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);

  const { data: genreData } = useQuery<GenresQueryData>(GET_GENRES);
  const { data: userData } = useQuery<UsersQueryData>(GET_USERS, {
    variables: { search: userSearch || undefined, limit: 200 },
  });

  const { data, loading, error, fetchMore, refetch } = useQuery<BooksQueryData>(
    GET_BOOKS,
    {
      variables: {
        search: search || undefined,
        genreId: genreId || undefined,
        limit: 12,
        cursor: undefined as string | undefined,
        userId: userId!,
      },
      skip: !userId,
    }
  );

  const [checkout, { loading: checkoutLoading }] = useMutation(CHECKOUT);
  const [addReview] = useMutation(ADD_REVIEW);

  const ordersQuery = useQuery<OrdersQueryData>(GET_ORDERS, {
    variables: { userId: userId || "" },
    skip: !userId || tab !== "orders",
  });

  const salesQuery = useQuery<SalesQueryData>(GET_SALES, {
    skip: tab !== "orders",
  });

  useEffect(() => {
    const first = userData?.users?.[0]?.id;
    if (!userId && first) setUserId(first);
  }, [userData, userId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    void refetch({
      search: searchInput || undefined,
      genreId: genreId || undefined,
      limit: 12,
      cursor: undefined,
      userId: userId!,
    });
  };

  const handleLoadMore = () => {
    const next = data?.books?.nextCursor;
    if (!next) return;
    fetchMore({
      variables: { cursor: next },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        const p = prev as BooksQueryData;
        const f = fetchMoreResult as BooksQueryData;
        return {
          books: {
            ...f.books,
            edges: [...(p?.books?.edges ?? []), ...f.books.edges],
          },
        };
      },
    });
  };

  const addToCart = (
    bookId: string,
    title: string,
    format: FormatTypeGql,
    quantity: number,
    unitPrice: number
  ) => {
    const key = `${bookId}-${format}`;
    setCart((prev) => {
      const i = prev.findIndex((l) => l.key === key);
      if (i >= 0) {
        const next = [...prev];
        next[i] = {
          ...next[i],
          quantity: next[i].quantity + quantity,
          unitPrice,
        };
        return next;
      }
      return [...prev, { key, bookId, title, format, quantity, unitPrice }];
    });
  };

  const updateCartQty = (key: string, quantity: number) => {
    if (quantity < 1) {
      setCart((prev) => prev.filter((l) => l.key !== key));
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, quantity } : l))
    );
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
  };

  const handleCheckout = async () => {
    if (!userId || cart.length === 0) return;
    await checkout({
      variables: {
        userId,
        items: cart.map((l) => ({
          bookId: l.bookId,
          format: l.format,
          quantity: l.quantity,
        })),
      },
    });
    setCart([]);
    setTab("orders");
    ordersQuery.refetch();
    salesQuery.refetch();
  };

  const handleSubmitReview = async (bookId: string) => {
    if (!userId) return;
    await addReview({
      variables: { bookId, userId, rating: reviewRating },
    });
    setReviewingBookId(null);
    refetch();
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
    [cart]
  );

  if (!userId && !userData?.users?.length) {
    return (
      <div className="app-shell">
        <p className="loading">Loading users…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>Bookstore</h1>
        <div className="user-row">
          <label>
            Find user
            <input
              type="text"
              placeholder="Filter by name…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </label>
          <label>
            Current user
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {(userData?.users ?? []).map((u: { id: string; name: string }) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <nav className="tabs">
        <button
          type="button"
          className={tab === "browse" ? "active" : ""}
          onClick={() => setTab("browse")}
        >
          Browse
        </button>
        <button
          type="button"
          className={tab === "cart" ? "active" : ""}
          onClick={() => setTab("cart")}
        >
          Cart ({cart.length})
        </button>
        <button
          type="button"
          className={tab === "orders" ? "active" : ""}
          onClick={() => setTab("orders")}
        >
          Orders &amp; reports
        </button>
      </nav>

      {tab === "browse" && (
        <>
          <form className="search-form" onSubmit={handleSearchSubmit}>
            <input
              className="search-input"
              type="search"
              placeholder="Search title or author…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <select
              className="filter-select"
              value={genreId}
              onChange={(e) => {
                const v = e.target.value;
                setGenreId(v);
                void refetch({
                  search: search || undefined,
                  genreId: v || undefined,
                  limit: 12,
                  cursor: undefined,
                  userId: userId!,
                });
              }}
            >
              <option value="">All genres</option>
              {(genreData?.genres ?? []).map((g: { id: string; name: string }) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button type="submit" className="search-btn">
              Search
            </button>
          </form>

          <p className="paging-hint">
            Pagination uses <strong>cursor-based</strong> paging (stable sort by
            id). Use Search to reset; Load more appends the next page.
          </p>

          {loading && !data && <p className="loading">Loading books…</p>}
          {error && (
            <p className="error">Could not load books: {error.message}</p>
          )}

          <div className="books-grid">
            {(data?.books?.edges ?? []).map((book: BookEdge) => (
                <div key={book.id} className="book-card">
                  <h2 className="book-title">{book.title}</h2>
                  <p className="meta">
                    <strong>Publisher:</strong> {book.publisher.name}
                  </p>
                  <p className="meta">
                    <strong>Authors:</strong>{" "}
                    {book.authors.map((a) => a.name).join(", ")}
                  </p>
                  <p className="meta">
                    <strong>Genres:</strong>{" "}
                    {book.genres.map((g) => g.name).join(", ")}
                  </p>
                  <p className="meta">
                    <strong>Formats:</strong>{" "}
                    {book.formats.map((f) => formatLabel(f.type)).join(", ")}
                  </p>
                  <p className="book-price">${book.price.toFixed(2)}</p>
                  <div className="book-rating">
                    <span className="rating">
                      {book.avgRating.toFixed(1)} ★
                    </span>
                    <span className="review-count">
                      ({book.reviewCount} reviews)
                    </span>
                  </div>

                  <BookCartSection
                    bookId={book.id}
                    title={book.title}
                    price={book.price}
                    formats={book.formats}
                    onAdd={addToCart}
                  />

                  {book.hasReviewed ? (
                    <p className="muted">You already reviewed this book.</p>
                  ) : reviewingBookId === book.id ? (
                    <div className="review-form">
                      <label>
                        Rating
                        <select
                          value={reviewRating}
                          onChange={(e) =>
                            setReviewRating(Number(e.target.value))
                          }
                        >
                          {[1, 2, 3, 4, 5].map((r) => (
                            <option key={r} value={r}>
                              {r} ★
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="row-btns">
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => handleSubmitReview(book.id)}
                        >
                          Submit review
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setReviewingBookId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%" }}
                      onClick={() => setReviewingBookId(book.id)}
                    >
                      Leave review
                    </button>
                  )}
                </div>
            ))}
          </div>

          {data?.books?.nextCursor && (
            <div className="pagination">
              <button
                type="button"
                className="load-more-btn"
                onClick={handleLoadMore}
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}

      {tab === "cart" && (
        <div className="panel">
          <h2>Shopping cart</h2>
          {cart.length === 0 ? (
            <p className="muted">Your cart is empty.</p>
          ) : (
            <>
              <table className="cart-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Format</th>
                    <th>Qty</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.key}>
                      <td>{line.title}</td>
                      <td>{formatLabel(line.format)}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateCartQty(
                              line.key,
                              Number(e.target.value) || 1
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => removeLine(line.key)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                <strong>Estimated total:</strong> ${cartTotal.toFixed(2)}
              </p>
              <p className="muted">
                Checkout records the server&apos;s current book price per line
                (memoized on the order).
              </p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={checkoutLoading || !userId}
                onClick={() => void handleCheckout()}
              >
                {checkoutLoading ? "Checking out…" : "Checkout"}
              </button>
            </>
          )}
        </div>
      )}

      {tab === "orders" && userId && (
        <>
          <div className="panel">
            <h2>Sales summary</h2>
            {salesQuery.loading && <p className="muted">Loading…</p>}
            {salesQuery.data ? (
              <div className="report-grid">
                <div className="report-card">
                  <div>Total units sold</div>
                  <div className="num">
                    {salesQuery.data.salesSummary.totalUnitsSold}
                  </div>
                </div>
                {salesQuery.data.salesSummary.unitsByGenre.map((g) => (
                  <div key={g.genreId} className="report-card">
                    <div>{g.genreName}</div>
                    <div className="num">{g.unitsSold} units</div>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="muted" style={{ marginTop: 12 }}>
              Genre totals count each order line toward every genre of that book
              (a multi-genre book contributes to each genre bucket).
            </p>
          </div>

          <div className="panel">
            <h2>Your order history</h2>
            {ordersQuery.loading && <p className="muted">Loading…</p>}
            {(ordersQuery.data?.orders ?? []).length === 0 && (
              <p className="muted">No orders yet.</p>
            )}
            {(ordersQuery.data?.orders ?? []).map((o) => (
              <div key={o.id} className="order-block">
                <h3>
                  Order {o.id.slice(0, 8)}… —{" "}
                  {new Date(o.createdAt).toLocaleString()} — $
                  {o.totalPrice.toFixed(2)}
                </h3>
                <ul>
                  {o.items.map((it) => (
                    <li key={it.id}>
                      {it.book.title} × {it.quantity} ({it.format}) @ $
                      {it.unitPrice.toFixed(2)} = ${it.lineTotal.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BookCartSection({
  bookId,
  title,
  price,
  formats,
  onAdd,
}: {
  bookId: string;
  title: string;
  price: number;
  formats: { id: string; type: FormatTypeGql }[];
  onAdd: (
    bookId: string,
    title: string,
    format: FormatTypeGql,
    qty: number,
    unitPrice: number
  ) => void;
}) {
  const [format, setFormat] = useState<FormatTypeGql | "">(
    formats[0]?.type ?? ""
  );
  const [qty, setQty] = useState(1);

  if (!formats.length) return null;

  return (
    <div className="cart-controls">
      <label>
        Format
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as FormatTypeGql)}
        >
          {formats.map((f) => (
            <option key={f.id} value={f.type}>
              {formatLabel(f.type)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Quantity
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
        />
      </label>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!format}
        onClick={() => {
          if (format) onAdd(bookId, title, format, qty, price);
        }}
      >
        Add to cart
      </button>
    </div>
  );
}
