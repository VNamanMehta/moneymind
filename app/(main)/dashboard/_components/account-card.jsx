"use client"

import { updateDefaultAccount } from "@/actions/accounts";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import useFetch from "@/hooks/use-fetch";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useEffect } from "react";
import { toast } from "sonner";

const AccountCard = ({ account }) => {
  const { name, type, balance, id, isDefault } = account;

  const {
    loading: updateDefaultLoading,
    func: updateDefaultfn,
    data: updateAccount,
    error,
  } = useFetch(updateDefaultAccount);

  const handleDefaultChange = async (e) => {
    e.preventDefault();

    if (isDefault) {
      toast.warning("You need atleast 1 default account");
      return;
    }
    await updateDefaultfn(id);
  };

  useEffect(() => {
    if (updateAccount?.success) {
      toast.success("Default account is updated successfully");
    }
  }, [updateAccount, updateDefaultLoading]);

  useEffect(() => {
    if (error) {
      toast.error(error.messge || "Failed to update default account.");
    }
  }, [error]);
  return (
    <Card className="hover:shadow-md transition-shadow group relative">
      <Link href={`/account/${id}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium capitalize">
            {name}
          </CardTitle>
          <div className="relative">
            {updateDefaultLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-full">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            <Switch
              checked={isDefault}
              onClick={handleDefaultChange}
              disabled={updateDefaultLoading}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${parseFloat(balance).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            {type.charAt(0) + type.slice(1).toLowerCase()} Account
          </p>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
            Income
          </div>
          <div className="flex items-center">
            <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
            Expense
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
};

export default AccountCard;
