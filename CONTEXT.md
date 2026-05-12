# Colophon

Personal book-catalog mobile application. Users log in with Google, search for books via the Google Books API, and add them to their personal library.

## Language

**User**:
A person who has authenticated with Google and has a Library in the system. Identified by `google_sub`.
_Avoid_: Account, Member

**Book**:
A bibliographic record (title, author, cover URL) sourced from Google Books. Shared across users — one row per real-world work, identified by `google_books_id`.
_Avoid_: Title (means something else in publishing), Edition

**ISBN**:
The 13-digit identifier printed as the barcode on a physical book (Bookland EAN-13, prefix `978`/`979`). Used only to *find* a Book — the app looks it up via Google Books (`q=isbn:…`) and still keys the resulting Book by `google_books_id`. Not stored on the Book.
_Avoid_: Barcode (the ISBN is the data; the barcode is just how it's printed), ISBN-10

**User Book**:
The relationship between a User and a Book they have added. Carries the date the User added the Book to their Library.
_Avoid_: Entry, Item, Record

**Library**:
The set of User Books belonging to one User. The canonical term everywhere — UI, API routes (`/v1/library/...`), code, schema, conversation.
_Avoid_: Catalog, Collection, Bookshelf

## Relationships

- A **User** has one **Library**
- A **Library** contains zero or more **User Books**
- A **User Book** references exactly one **Book** and belongs to exactly one **User**
- A **Book** can appear in many **User Books** across different users

## Example dialogue

> **Dev:** "When the user adds a Google Books search result to their **Library**, do we create a new **Book** row?"
> **Domain expert:** "Only if no existing **Book** matches the `google_books_id`. Otherwise reuse the existing **Book** and create a new **User Book** linking this **User** to it."

