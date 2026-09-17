import type { RowDataPacket } from "mysql2";

import type { User } from "@/api/user/userModel";
import { database } from "@/common/database";

type UserRow = RowDataPacket & {
	id: number;
	name: string;
	email: string;
	age: number;
	created_at: Date;
	updated_at: Date;
};

function mapUser(row: UserRow): User {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		age: row.age,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export class UserRepository {
	async findAllAsync(): Promise<User[]> {
		const [rows] = await database.query<UserRow[]>(
			"SELECT id, name, email, age, created_at, updated_at FROM users",
		);

		return rows.map(mapUser);
	}

	async findByIdAsync(id: number): Promise<User | null> {
		const [rows] = await database.execute<UserRow[]>(
			"SELECT id, name, email, age, created_at, updated_at FROM users WHERE id = ?",
			[id],
		);

		return rows.length > 0 ? mapUser(rows[0]) : null;
	}
}
