const std = @import("std");

pub fn main() !void {
    try std.io.getStdOut().writer().writeAll("Content-Type: application/json\r\n\r\n{\"language\":\"Zig\",\"runtime\":\"WAGI\"}\n");
}