import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import client from "@/api/client";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

export function useSupportTickets() {
  const { isAuthenticated, sessionReady } = useCustomerAuth();

  return useQuery({
    queryKey: ["supportTickets"],
    queryFn: () => client.get("/support/tickets"),
    select: (data) => data?.tickets ?? [],
    enabled: isAuthenticated && sessionReady,
  });
}

export function useSupportTicket(ticketId) {
  return useQuery({
    queryKey: ["supportTicket", ticketId],
    queryFn: () => client.get(`/support/tickets/${ticketId}`),
    select: (data) => data?.ticket ?? null,
    enabled: !!ticketId,
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ category, description, orderId }) =>
      client.post("/support/tickets", { category, description, orderId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
      // Prime the thread so opening the ticket just created doesn't flash a
      // spinner for a payload we already have.
      if (data?.ticket) queryClient.setQueryData(["supportTicket", data.ticket._id], data);
    },
  });
}

export function useReplyToTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, text }) =>
      client.post(`/support/tickets/${ticketId}/messages`, { text }),
    onSuccess: (data, { ticketId }) => {
      // The reply endpoint returns the whole updated ticket — writing it straight
      // to the cache is what makes the new message appear immediately.
      if (data?.ticket) queryClient.setQueryData(["supportTicket", ticketId], data);
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    },
  });
}
