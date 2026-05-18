"""enrich books with google volume metadata

Revision ID: 4243f6b45827
Revises: f7e09b7f0dd8
Create Date: 2026-05-18 14:23:46.513831

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4243f6b45827"
down_revision: Union[str, Sequence[str], None] = "f7e09b7f0dd8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("books", sa.Column("subtitle", sa.String(), nullable=True))
    op.add_column("books", sa.Column("publisher", sa.String(), nullable=True))
    op.add_column("books", sa.Column("published_date", sa.String(), nullable=True))
    op.add_column("books", sa.Column("description", sa.String(), nullable=True))
    op.add_column("books", sa.Column("page_count", sa.Integer(), nullable=True))
    op.add_column("books", sa.Column("categories", sa.String(), nullable=True))
    op.add_column("books", sa.Column("language", sa.String(), nullable=True))
    op.add_column("books", sa.Column("isbn_13", sa.String(), nullable=True))
    op.add_column("books", sa.Column("isbn_10", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("books", "isbn_10")
    op.drop_column("books", "isbn_13")
    op.drop_column("books", "language")
    op.drop_column("books", "categories")
    op.drop_column("books", "page_count")
    op.drop_column("books", "description")
    op.drop_column("books", "published_date")
    op.drop_column("books", "publisher")
    op.drop_column("books", "subtitle")
