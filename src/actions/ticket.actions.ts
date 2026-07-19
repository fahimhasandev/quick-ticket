"use server";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { logEvent } from "@/utils/sentry";
import { getCurrentUser } from "@/lib/current-user";

interface IPreviousState {
  success: boolean;
  message: string;
}

export async function createTicket(
  prevState: IPreviousState,
  formData: FormData,
): Promise<IPreviousState> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      logEvent("Unauthorized ticket creation attemp", "ticket", {}, "warning");

      return {
        success: false,
        message: "you must be logined in to create ticket",
      };
    }

    // name = "subject" have to match in the form components
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;

    console.log({ subject, description, priority });

    if (!subject || !description || !priority) {
      logEvent(
        "Validation Error: Missing ticket fields",
        "ticket",
        { subject, description, priority },
        "warning",
      );
      return {
        success: false,
        message: "All fields are required",
      };
    }

    //Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        subject,
        description,
        priority,
        user: {
          connect: { id: user.id },
        },
      },
    });

    // Sentry.addBreadcrumb({
    //   category: "ticket",
    //   message: `Ticket created: ${ticket.id}`,
    // });

    // Sentry.captureMessage(`Ticket was created successfully: ${ticket.id}`);

    logEvent(
      `Ticket created Successfully: ${ticket.id}`,
      "ticket",
      { ticketId: ticket.id },
      "info",
    );

    revalidatePath("/tickets");

    return {
      success: true,
      message: "Ticket Create successfully",
    };
  } catch (error) {
    // Sentry.captureException(error as Error, {
    //   extra: { formData: Object.fromEntries(formData.entries()) },
    // });

    logEvent(
      "An error occurred while creating the ticket,",
      "ticket",
      {
        formData: Object.fromEntries(formData.entries()),
      },
      "error",
      error,
    );
    return {
      success: false,
      message: "All fields are required",
    };
  }
}

export async function getTickets() {
  try {
    //
    const user = await getCurrentUser();

    if (!user) {
      logEvent("Unauthorized ticket fetch attempt", "ticket", {}, "warning");
      return [];
    }

    const tickets = await prisma.ticket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    logEvent("Fetch ticket list", "ticket", { count: tickets.length }, "info");

    return tickets;
  } catch (error) {
    logEvent("Error fetching tickets", "ticket", {}, "error", error);
    return [];
  }
}

export async function getTicketById(id: string) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: Number(id) },
    });

    if (!ticket) {
      logEvent(
        `Ticket not found with id: ${id}`,
        "ticket",
        { ticketId: id },
        "warning",
      );
    }

    return ticket;
  } catch (error) {
    logEvent(
      "Error fetching ticket details",
      "ticket",
      { ticketId: id },
      "error",
      error,
    );

    return null;
  }
}
