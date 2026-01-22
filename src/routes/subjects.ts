import express from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { departments, subjects } from "../db/schema";
import { db } from "../db/index";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, department, page = 1, limit = 2 } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 2);
    const limitPerPage = Math.max(1, parseInt(String(limit), 10) || 10);
    //How many records to skeep to get to next page
    const offset = (currentPage - 1) * limitPerPage;
    //store filter conditiions
    const filterConditions = [];
    //if subject search qruery exists , filter by subject "or" subject code
    if (search) {
      filterConditions.push(
        or(
          ilike(subjects.name, `%${search}%`),
          ilike(subjects.code, `%${search}%`),
        ),
      );
    }
    //if department search query exists, filter by department name
    if (department) {
      const deptPattern = `%${String(department).replace(/[%_]/g, "\\$&")}%`;
      filterConditions.push(ilike(departments.name, deptPattern));
    }
    //combine filters results , if it exists
    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;
    //
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause);
    const totalCount = countResult[0]?.count ?? 0;
    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: {
          ...getTableColumns(departments),
        },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause)
      .orderBy(desc(subjects.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (e) {
    console.log(`GET /subjects error: ${e}`);
    res.status(500).json({ error: "Failed to get subjects" });
  }
});

export default router;
